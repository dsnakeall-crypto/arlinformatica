import React, { useEffect, useRef, useState } from 'react';
import { Mic, Square } from 'lucide-react';

type Result = { isFinal: boolean; 0: { transcript: string } };
type Recognition = {
  lang: string; continuous: boolean; interimResults: boolean;
  onresult: ((event: { resultIndex: number; results: ArrayLike<Result> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void; stop(): void; abort(): void;
};
type SpeechWindow = Window & {
  SpeechRecognition?: new () => Recognition;
  webkitSpeechRecognition?: new () => Recognition;
};

export default function ReportDictation({ onTranscript }: { onTranscript: (text: string) => void }) {
  const recognition = useRef<Recognition | null>(null);
  const callback = useRef(onTranscript);
  callback.current = onTranscript;
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState('');
  const [preview, setPreview] = useState('');
  const speechWindow = window as SpeechWindow;
  const Constructor = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;

  useEffect(() => {
    const stopWhenHidden = () => { if (document.hidden) recognition.current?.stop(); };
    const release = () => {
      const current = recognition.current;
      recognition.current = null;
      if (current) { current.onresult = null; current.onerror = null; current.onend = null; current.abort(); }
    };
    const pageHidden = () => { release(); setListening(false); setPreview(''); };
    document.addEventListener('visibilitychange', stopWhenHidden);
    window.addEventListener('pagehide', pageHidden);
    return () => {
      document.removeEventListener('visibilitychange', stopWhenHidden);
      window.removeEventListener('pagehide', pageHidden);
      release();
    };
  }, []);

  const toggle = () => {
    if (recognition.current) { recognition.current.stop(); return; }
    if (!Constructor) return;
    const current = new Constructor();
    recognition.current = current;
    current.lang = 'pt-BR'; current.continuous = true; current.interimResults = true;
    let nextFinal = 0;
    current.onresult = event => {
      if (recognition.current !== current) return;
      let pending = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          if (i >= nextFinal) { callback.current(result[0].transcript.trim()); nextFinal = i + 1; }
        } else pending += result[0].transcript;
      }
      setPreview(pending);
    };
    current.onerror = event => {
      if (recognition.current !== current) return;
      const errors: Record<string, string> = {
        'not-allowed': 'Permita o microfone no navegador para ditar.',
        'service-not-allowed': 'O serviço de voz não está disponível neste navegador.',
        'audio-capture': 'Não foi possível acessar o microfone.',
        'network': 'Falha na conexão com o serviço de voz. Tente novamente.',
        'no-speech': 'Nenhuma fala reconhecida. Tente novamente.',
      };
      setMessage(errors[event.error] || 'Ditado interrompido. Você pode continuar digitando.');
    };
    current.onend = () => {
      if (recognition.current !== current) return;
      recognition.current = null; setListening(false); setPreview('');
    };
    setMessage(''); setPreview(''); setListening(true);
    try { current.start(); } catch {
      recognition.current = null; setListening(false); setMessage('Não foi possível iniciar o ditado. Tente novamente.');
    }
  };

  return <div className="arl-report-dictation">
    <button type="button" className="arl-text-improvement-action" onClick={toggle} disabled={!Constructor} aria-pressed={listening}>
      {listening ? <Square aria-hidden="true" /> : <Mic aria-hidden="true" />}{listening ? 'Parar ditado' : 'Ditar laudo'}
    </button>
    <small role="status" aria-live="polite">{!Constructor ? 'Ditado indisponível neste navegador.' : message || (listening ? preview || 'Ouvindo…' : '')}</small>
  </div>;
}
