import { useState } from "react";
import { ArrowRight, Check, Info, LayoutDashboard, Monitor, Settings2, Smartphone } from "lucide-react";
import PageHeader from "./page-header";
import "../css/layouts-settings.css";
import MobileReadOnlySettings from "./mobile-readonly-settings";
import { isHandheldDevice } from "./layout-preference";
import AppearanceSettings from "./appearance-settings";

export type LayoutSelection = "desktop" | "premium";

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
    id: "premium" as const,
    title: "Mobile Premium",
    tag: "Layout mobile oficial",
    description: "Painel, Clientes, + Abrir OS, Gastos e Menu flutuante. Este Ã© o Ãºnico layout mobile da ARL.",
    Icon: Smartphone,
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
        <p>No aplicativo ARL vocÃª pode escolher entre Web / PC e Mobile Premium. O Controle de Gastos mantÃ©m seu prÃ³prio visual e todas as regras.</p>
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
      <p className="arl-layout-settings-note"><Info aria-hidden="true" /> O Mobile Premium Ã© o Ãºnico visual mobile da ARL. O sistema muda automaticamente ao cruzar o tamanho de tela de celular; os dados permanecem os mesmos.</p>
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
