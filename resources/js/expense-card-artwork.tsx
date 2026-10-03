import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Check, CreditCard, ImagePlus, Search, Wifi } from 'lucide-react';

export type CardArtwork = { key: string; name: string; color: string; accent: string; wordmark: string; kind: 'official' | 'illustrative'; image_url: string | null };
const searchable = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');

export type CardAppearance = { name: string; color: string; artwork_key?: string | null; image_url?: string | null };

export function CardArtworkView({ card, artworks }: { card: CardAppearance; artworks: CardArtwork[] }) {
  const art = artworks.find(a => a.key === card.artwork_key);
  const image = card.image_url || art?.image_url;
  return <div className={'cg-card-art' + (image ? ' cg-card-photo' : '')} style={{ '--card-color': art?.color || card.color, '--card-accent': art?.accent || '#29222d', '--card-ink': art?.key === 'bb' ? '#073b88' : '#fff' } as CSSProperties}>
    {image ? <img src={image} alt={'Imagem do cartão ' + card.name} /> : <><strong className="cg-card-wordmark">{art?.wordmark || card.name || 'Seu cartão'}</strong><span className="cg-card-chip" aria-hidden="true" /><Wifi className="cg-card-contactless" aria-hidden="true" /><span className="cg-card-caption">CONTROLE DE GASTO</span><CreditCard className="cg-card-symbol" aria-hidden="true" /></>}
  </div>;
}

export default function CardArtworkPicker({ artworks, card, onChange, onImage, onPending }: { artworks: CardArtwork[]; card: CardAppearance; onChange: (art: CardArtwork | null) => void; onImage: (file: File | null, url: string | null) => void; onPending: (value: boolean) => void }) {
  const [mode, setMode] = useState<'gallery' | 'upload'>(card.image_url ? 'upload' : 'gallery');
  const [search, setSearch] = useState(''), [source, setSource] = useState(''), [error, setError] = useState('');
  const [zoom, setZoom] = useState(1), [horizontal, setHorizontal] = useState(50), [vertical, setVertical] = useState(50);
  const [prepared, setPrepared] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null), sourceImage = useRef<HTMLImageElement | null>(null), fileInput = useRef<HTMLInputElement>(null);
  useEffect(() => () => { if (source) URL.revokeObjectURL(source); }, [source]);
  useEffect(() => {
    if (!source) { sourceImage.current = null; return; }
    const image = new Image();
    let cancelled = false;
    image.onload = () => { if (!cancelled) { sourceImage.current = image; setPrepared(true); } };
    image.onerror = () => { if (!cancelled) setError('Não foi possível abrir a imagem.'); };
    image.src = source;
    return () => { cancelled = true; };
  }, [source]);
  useEffect(() => {
    const image = sourceImage.current, target = canvas.current;
    if (!image || !target || !prepared) return;
    const context = target.getContext('2d');
    if (!context) return;
    const scale = Math.max(856 / image.naturalWidth, 540 / image.naturalHeight) * zoom;
    const width = image.naturalWidth * scale, height = image.naturalHeight * scale;
    context.fillStyle = '#fff'; context.fillRect(0, 0, 856, 540);
    context.drawImage(image, (856 - width) * horizontal / 100, (540 - height) * vertical / 100, width, height);
  }, [zoom, horizontal, vertical, prepared]);
  const load = (file?: File) => {
    setError('');
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 4 * 1024 * 1024) { setError('Escolha JPG, PNG ou WebP de até 4 MB.'); return; }
    onPending(true); setPrepared(false); setZoom(1); setHorizontal(50); setVertical(50); setSource(URL.createObjectURL(file));
  };
  const apply = () => {
    const target = canvas.current;
    if (!target) return;
    target.toBlob(blob => {
      if (!blob) { setError('Não foi possível preparar a imagem.'); return; }
      const file = new File([blob], 'cartao.jpg', { type: 'image/jpeg' });
      onImage(file, target.toDataURL('image/jpeg', .85));
      setSource(''); setPrepared(false); onPending(false); setError('');
    }, 'image/jpeg', .85);
  };
  return <section className="cg-artwork-picker" aria-label="Aparência do cartão">
    <div className="cg-artwork-heading"><div><b>Aparência do cartão</b><p>Escolha um banco ou personalize com uma imagem.</p></div><CreditCard /></div>
    <div className="cg-artwork-layout"><div className="cg-artwork-preview"><CardArtworkView card={card} artworks={artworks} /><span>PRÉVIA DO CARTÃO</span><small>Mesma proporção e acabamento em todos os cadastros.</small></div>
      <div className="cg-artwork-options"><div className="cg-artwork-modes"><button type="button" aria-pressed={mode === 'gallery'} onClick={() => setMode('gallery')}>Galeria de bancos</button><button type="button" aria-pressed={mode === 'upload'} onClick={() => setMode('upload')}><ImagePlus /> Minha imagem</button></div>
        {mode === 'gallery' ? <><label className="cg-artwork-search"><Search /><input aria-label="Buscar banco na galeria" placeholder="Buscar banco…" value={search} onChange={e => setSearch(e.target.value)} /></label><div className="cg-artwork-gallery">{artworks.filter(a => searchable(a.name).includes(searchable(search))).map(art => <button type="button" key={art.key} aria-label={'Selecionar cartão ' + art.name} aria-pressed={card.artwork_key === art.key && !card.image_url} onClick={() => { setSource(''); onPending(false); onImage(null, null); onChange(art); }}><CardArtworkView card={{ name: art.name, color: art.color, artwork_key: art.key }} artworks={artworks} /><b>{art.name}</b><small>{art.kind === 'official' ? 'Arte oficial' : 'Modelo ilustrativo'}</small>{card.artwork_key === art.key && !card.image_url && <Check className="cg-artwork-check" />}</button>)}</div><button type="button" onClick={() => { setSource(''); onPending(false); onImage(null, null); onChange(null); }}>Usar cartão personalizado</button></> : <><label className="cg-artwork-upload"><ImagePlus /><b>Escolher imagem do cartão</b><small>JPG, PNG ou WebP · até 4 MB</small><input ref={fileInput} aria-label="Imagem do cartão" type="file" accept="image/jpeg,image/png,image/webp" onChange={e => { load(e.target.files?.[0]); e.target.value = ''; }} /></label><p className="cg-muted">Use uma arte do banco ou uma foto sem número, validade, nome do titular e código de segurança.</p>{source && <div className="cg-card-crop"><canvas ref={canvas} width={856} height={540} aria-label="Prévia de enquadramento" /><label>Zoom<input type="range" min="1" max="3" step=".05" value={zoom} onChange={e => setZoom(Number(e.target.value))} /></label><label>Posição horizontal<input type="range" min="0" max="100" value={horizontal} onChange={e => setHorizontal(Number(e.target.value))} /></label><label>Posição vertical<input type="range" min="0" max="100" value={vertical} onChange={e => setVertical(Number(e.target.value))} /></label><div className="cg-actions"><button type="button" disabled={!prepared} className="cg-primary" onClick={apply}>Aplicar enquadramento</button><button type="button" onClick={() => { setSource(''); setPrepared(false); onPending(false); }}>Descartar imagem</button></div><small>Aplique o enquadramento antes de salvar o cadastro.</small></div>}{card.image_url && <button type="button" onClick={() => { setSource(''); onPending(false); onImage(null, null); onChange(null); }}>Remover imagem</button>}</>}
        {error && <p role="alert" className="cg-alert">{error}</p>}
      </div></div>
  </section>;
}
