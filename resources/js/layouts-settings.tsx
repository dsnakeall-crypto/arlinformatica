import { useState } from "react";
import { ArrowRight, Check, Info, LayoutDashboard, Monitor, PanelLeft, Settings2, Smartphone } from "lucide-react";
import PageHeader from "./page-header";
import "../css/layouts-settings.css";
import MobileReadOnlySettings from "./mobile-readonly-settings";
import { isHandheldDevice } from "./layout-preference";
import AppearanceSettings from "./appearance-settings";

export type LayoutSelection = "desktop" | "bottom" | "compact";

export type LayoutSettingsProps = {
  selected: LayoutSelection;
  onChange: (mode: LayoutSelection) => void;
};

const options = [
  {
    id: "desktop" as const,
    title: "Web / PC",
    tag: "Computador",
    description: "Painel completo, tabelas e menu lateral tradicional. Ideal para telas grandes.",
    Icon: Monitor,
  },
  {
    id: "bottom" as const,
    title: "Mobile — barra inferior",
    tag: "Celular / tablet",
    description: "Atalhos Painel, Clientes, Abrir OS, Financeiro e Gestor de Gasto embaixo; menu lateral complementar para o restante.",
    Icon: Smartphone,
  },
  {
    id: "compact" as const,
    title: "Mobile — menu lateral compacto",
    tag: "Celular / tablet",
    description: "Barra fina de ícones sempre visível à esquerda, sem menu inferior. Mais espaço vertical.",
    Icon: PanelLeft,
  },
];

function LayoutPreview({ type }: { type: LayoutSelection }) {
  return (
    <span className={`arl-layout-preview arl-layout-preview-${type}`} aria-hidden="true">
      <span className="arl-layout-preview-device">
        <span className="arl-layout-preview-sidebar">
          <i /><i /><i /><i />
        </span>
        <span className="arl-layout-preview-body">
          <span className="arl-layout-preview-top"><i /><i /></span>
          <span className="arl-layout-preview-heading" />
          <span className="arl-layout-preview-panels">
            <i /><i /><i />
          </span>
          <span className="arl-layout-preview-lines"><i /><i /><i /></span>
        </span>
        <span className="arl-layout-preview-bar"><i /><i /><i /><i /><i /></span>
      </span>
    </span>
  );
}

export default function LayoutsSettings({ selected, onChange }: LayoutSettingsProps) {
  const isPhoneOrTablet = isHandheldDevice(navigator.userAgent);
  return (
    <section className="arl-layout-settings" aria-labelledby="arl-layout-title">
      <div className="arl-layout-settings-intro">
        <span className="arl-layout-settings-kicker"><Settings2 aria-hidden="true" /> PERSONALIZAÇÃO</span>
        <h2 id="arl-layout-title">Escolha o seu layout</h2>
        <p>{isPhoneOrTablet ? 'No celular, escolha apenas entre a barra inferior e o menu lateral compacto. O visual Clean é fixo.' : 'Selecione a forma de navegar que combina com seu dispositivo. A alteração é aplicada na hora.'}</p>
      </div>
      <div className="arl-layout-options" role="group" aria-label="Opções de layout">
        {options.filter(option => !isPhoneOrTablet || option.id !== 'desktop').map(({ id, title, tag, description, Icon }) => {
          const active = selected === id;
          return (
            <button
              key={id}
              className={`arl-layout-option${active ? " is-selected" : ""}`}
              type="button"
              aria-label={title}
              aria-pressed={active}
              onClick={() => onChange(id)}
            >
              <span className="arl-layout-option-top">
                <span className="arl-layout-option-icon"><Icon aria-hidden="true" /></span>
                <span className="arl-layout-option-tag">{tag}</span>
                <span className="arl-layout-option-check" aria-hidden="true">{active && <Check />}</span>
              </span>
              <LayoutPreview type={id} />
              <span className="arl-layout-option-title">{title}</span>
              <span className="arl-layout-option-desc">{description}</span>
              <span className={`arl-layout-option-action${active ? " active" : ""}`}>
                {active ? "Selecionado" : "Selecionar layout"}
                {!active && <ArrowRight aria-hidden="true" />}
              </span>
            </button>
          );
        })}
      </div>
      {!isPhoneOrTablet && selected === 'desktop' && (
        <section className="arl-web-style-choices" aria-label="Escolha de aparência do Web/PC">
          <AppearanceSettings />
        </section>
      )}
      <p className="arl-layout-settings-note"><Info aria-hidden="true" /> A escolha fica salva neste navegador e não muda ao redimensionar, minimizar ou mover a janela entre monitores.</p>
    </section>
  );
}

export function SimpleSettingsPage(props: LayoutSettingsProps) {
  const [section, setSection] = useState<"layouts" | "overview">("layouts");
  return (
    <>
      <PageHeader eyebrow="PREFERÊNCIAS" title="Configurações" description="Personalize sua navegação e consulte as informações da empresa." icon={LayoutDashboard} />
      <div className="arl-settings-tabs" role="tablist" aria-label="Seções de Configurações">
        <button type="button" role="tab" aria-selected={section === "layouts"} className={`arl-settings-tab${section === "layouts" ? " active" : ""}`} onClick={() => setSection("layouts")}>
          <Settings2 aria-hidden="true" /><b>Layouts</b>
        </button>
        <button type="button" role="tab" aria-selected={section === "overview"} className={`arl-settings-tab${section === "overview" ? " active" : ""}`} onClick={() => setSection("overview")}>
          <Info aria-hidden="true" /><b>Informações</b>
        </button>
      </div>
      {section === "layouts" ? <LayoutsSettings {...props} /> : <MobileReadOnlySettings />}
    </>
  );
}
