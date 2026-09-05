export {};

type ClientHit = {id:number;name:string;phone:string;document:string;city?:string;state?:string};

declare global {
  interface Window { __arlBrandFetchInstalled?: boolean; __arlCurrentOrderId?: number; __arlSelectedClient?: ClientHit | null; }
}

const BRAND = {
  primary: '#C9001C',
  primaryDark: '#8F0016',
  sidebar: '#09080A',
  accent: '#FF2443',
};

const csrf = () => document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
const q = <T extends Element = HTMLElement>(selector:string, root:ParentNode=document) => root.querySelector<T>(selector);
const qa = <T extends Element = HTMLElement>(selector:string, root:ParentNode=document) => Array.from(root.querySelectorAll<T>(selector));
const text = (el:Element|null) => (el?.textContent ?? '').trim();
const once = (el:Element|null, key:string) => !!el && (el as HTMLElement).dataset[key] !== '1';
const mark = (el:Element|null, key:string) => { if (el) (el as HTMLElement).dataset[key] = '1'; };
const escapeHtml = (value:string) => value.replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c] ?? c));
const digits = (value:string) => value.replace(/\D/g,'');
const maskPhone = (value:string) => digits(value).slice(0,11).replace(/^(\d{2})(\d)/,'($1) $2').replace(/(\d{5})(\d)/,'$1-$2');
const formatDoc = (value:string) => {
  const n=digits(value).slice(0,14);
  return n.length<=11?n.replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d{1,2})$/,'$1-$2'):n.replace(/(\d{2})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1/$2').replace(/(\d{4})(\d)/,'$1-$2');
};
const api = async (url:string, options:RequestInit={}) => {
  const response=await fetch('/api'+url,{credentials:'same-origin',...options,headers:{Accept:'application/json',...(options.body instanceof FormData?{}:{'Content-Type':'application/json'}),...(csrf()?{'X-CSRF-TOKEN':csrf()}:{}),...options.headers}});
  const body=await response.json().catch(()=>({message:'Resposta inválida do servidor.'}));
  if(!response.ok) throw new Error(body.message || 'Não foi possível concluir.');
  return body;
};
const template = (source:string, values:Record<string,string>) => Object.entries(values).reduce((out,[key,value])=>out.replaceAll(`{{${key}}}`,value||''),source||'');
const whatsapp = (phone:string, message:string) => {
  const raw=digits(phone); const full=raw.startsWith('55')?raw:`55${raw}`;
  return `https://wa.me/${full}?text=${encodeURIComponent(message)}`;
};

function installFixedTheme(){
  const root=document.documentElement;
  root.style.setProperty('--arl-primary',BRAND.primary);
  root.style.setProperty('--arl-primary-dark',BRAND.primaryDark);
  root.style.setProperty('--arl-primary-soft','#FFF0F3');
  root.style.setProperty('--arl-primary-border','#F1BCC5');
  root.style.setProperty('--arl-primary-shadow','rgba(201,0,28,.24)');
  root.style.setProperty('--arl-on-primary','#FFFFFF');
  root.style.setProperty('--arl-sidebar',BRAND.sidebar);
  root.style.setProperty('--arl-sidebar-dark','#020203');
  root.style.setProperty('--arl-on-sidebar','#FFFFFF');
  root.style.setProperty('--arl-accent',BRAND.accent);
  root.style.setProperty('--arl-accent-soft','#FFE8ED');
  const meta=q<HTMLMetaElement>('meta[name="theme-color"]'); if(meta) meta.content=BRAND.sidebar;
}

function installFetchObserver(){
  if(window.__arlBrandFetchInstalled) return;
  window.__arlBrandFetchInstalled=true;
  const nativeFetch=window.fetch.bind(window);
  window.fetch=async(input:RequestInfo|URL, init?:RequestInit)=>{
    const response=await nativeFetch(input,init);
    try{
      const raw=typeof input==='string'?input:input instanceof URL?input.toString():input.url;
      const url=new URL(raw,location.origin);
      const method=(init?.method || (input instanceof Request?input.method:'GET')).toUpperCase();
      const orderMatch=url.pathname.match(/^\/api\/orders\/(\d+)$/);
      if(orderMatch && method==='GET' && response.ok) window.__arlCurrentOrderId=Number(orderMatch[1]);
      if(url.pathname==='/api/orders' && method==='POST' && response.ok){
        const created=await response.clone().json().catch(()=>null);
        if(created?.id) setTimeout(()=>void showOrderOpened(created),80);
      }
    }catch{}
    return response;
  };
}

function brandImage():HTMLImageElement{
  const img=document.createElement('img');img.src='/api/settings/logo/menu';img.alt='ARL Informática';
  img.addEventListener('error',()=>{if(!img.src.endsWith('/arl-assets/arl.svg')) img.src='/arl-assets/arl.svg'});
  return img;
}

function enhanceShell(){
  const aside=q('aside'); if(!aside) return;
  const logo=q<HTMLElement>('.logo',aside);
  if(once(logo,'arlBrand')){logo!.innerHTML='';logo!.classList.add('brand-logo');logo!.append(brandImage());mark(logo,'arlBrand')}
  qa<HTMLButtonElement>('nav button',aside).forEach(btn=>{
    if(!q('.arl-nav-arrow',btn)){const arrow=document.createElement('span');arrow.className='arl-nav-arrow';arrow.textContent='›';btn.append(arrow)}
  });
  const profile=q<HTMLElement>('.profile',aside); if(profile && !q('.arl-profile-arrow',profile)){const arrow=document.createElement('span');arrow.className='arl-profile-arrow';arrow.textContent='›';profile.append(arrow)}
  if(!q('.arl-sidebar-slogan',aside)){const slogan=document.createElement('small');slogan.className='arl-sidebar-slogan';slogan.textContent='TECNOLOGIA QUE FAZ MAIS POR VOCÊ';aside.append(slogan)}
  const mobile=q<HTMLElement>('.mobile-logo');
  if(mobile && once(mobile,'arlBrand')){mobile.innerHTML='';mobile.append(brandImage());mark(mobile,'arlBrand')}
  const layout=q<HTMLElement>('.device-layout'); if(layout){layout.classList.add('arl-device-layout');if(!q('.arl-layout-label',layout)){const s=document.createElement('span');s.className='arl-layout-label';s.textContent='Layout';layout.prepend(s)}}
}

function titleEyebrow(title:HTMLElement, label:string){
  title.classList.add('page-title'); const group=title.firstElementChild as HTMLElement|null; if(!group) return;
  if(!q('.arl-eyebrow',group)){const e=document.createElement('span');e.className='arl-eyebrow';e.textContent=label;group.prepend(e)}
}

function enhanceDashboard(){
  const h=q<HTMLHeadingElement>('h1'); if(text(h)!=='Painel' && text(h)!=='Mesa de Chamados') return;
  const title=h?.closest<HTMLElement>('.title'); if(title) titleEyebrow(title,text(h)==='Painel'?'BEM-VINDO À ARL':'OPERAÇÃO ARL');
  if(text(h)==='Mesa de Chamados'){q('.desk')?.classList.add('arl-vivid-desk');return}
  q('.dashboard-cards')?.classList.add('arl-summary-cards'); q('.dashboard-cards + .panel')?.classList.add('arl-dashboard-panel');
  const titleActions=q<HTMLElement>('.title .actions'); if(titleActions){const buttons=qa<HTMLButtonElement>('button',titleActions);if(buttons[1]) buttons[1].classList.add('arl-dark-action')}
  qa<HTMLElement>('.dashboard-row:not(.head)').forEach(row=>{
    row.classList.add('arl-dashboard-row');
    const cells=Array.from(row.children) as HTMLElement[];
    if(cells[2]) cells[2].classList.add('arl-status-badge',`arl-status-${normalizedStatus(text(cells[2]))}`);
    const contact=cells[3]; if(contact?.tagName==='A' && !q('.arl-wa-mark',contact)){const icon=document.createElement('span');icon.className='arl-wa-mark';icon.textContent='☎';contact.prepend(icon);contact.classList.add('arl-contact')}
    const address=cells[4]; if(address?.tagName==='A' && !q('.arl-map-mark',address)){const icon=document.createElement('span');icon.className='arl-map-mark';icon.textContent='●';address.prepend(icon);address.classList.add('arl-address')}
    const action=cells[7]; if(action?.tagName==='BUTTON'){action.classList.add('arl-view-order');if(!action.textContent?.includes('◉')) action.prepend('◉ ')}
  });
}
function normalizedStatus(label:string){return label.includes('Análise')?'analysis':label.includes('Peça')?'waiting':label.includes('Serviço')?'service':label.includes('Concluído')?'completed':'interrupted'}

function enhanceClients(){
  const h=qa<HTMLHeadingElement>('h1').find(x=>['Cadastro de Clientes','Gestão de Clientes'].includes(text(x))); if(!h) return;
  h.textContent='Gestão de Clientes'; const title=h.closest<HTMLElement>('.title'); if(title) titleEyebrow(title,'ARL INFORMÁTICA');
  const panel=q<HTMLElement>('.clients-list-panel'); if(!panel) return; panel.classList.add('arl-clients-panel');
  const filters=q<HTMLElement>('.filters',panel);
  if(filters && !q('.arl-client-search-head',panel)){
    const head=document.createElement('div');head.className='arl-client-search-head';head.innerHTML='<div><b>⌕ &nbsp; Buscar clientes</b><small>Pesquise por nome, telefone ou CPF/CNPJ</small></div><span class="arl-client-count"></span>';panel.insertBefore(head,filters);
  }
  const cards=qa<HTMLElement>('.client-list article',panel); const count=q<HTMLElement>('.arl-client-count',panel); if(count) count.textContent=`${cards.length} ${cards.length===1?'cliente encontrado':'clientes encontrados'}`;
  cards.forEach(card=>{
    card.classList.add('arl-client-card'); const first=card.firstElementChild as HTMLElement|null; if(first && !q('.arl-client-avatar',first)){
      const name=text(q('b',first)); const avatar=document.createElement('span');avatar.className='arl-client-avatar';avatar.textContent=name.split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase();first.prepend(avatar);first.classList.add('arl-client-main')
    }
    const actions=q<HTMLElement>('.contact-links',card); if(actions){actions.classList.add('arl-vivid-actions');qa<HTMLElement>('a,button',actions).forEach(a=>{const t=text(a);if(t==='WhatsApp')a.classList.add('arl-action-whatsapp');if(t==='Maps')a.classList.add('arl-action-maps');if(t==='Visualizar')a.classList.add('arl-action-view');if(t==='Editar')a.classList.add('arl-action-edit');if(!q('.arl-action-icon',a)){const i=document.createElement('span');i.className='arl-action-icon';i.textContent=t==='WhatsApp'?'●':t==='Maps'?'◆':t==='Visualizar'?'◉':'✎';a.prepend(i)}})}
  });
  q('.clients-editor .form-card')?.classList.add('arl-client-form');
}

function enhanceNewOrder(){
  const h=qa<HTMLHeadingElement>('h1').find(x=>text(x)==='Abertura de Chamado / Nova OS'); if(!h) return;
  const title=h.closest<HTMLElement>('.title'); if(title) titleEyebrow(title,'ATENDIMENTO ARL');
  const form=q<HTMLFormElement>('form.os-form'); if(!form) return; form.classList.add('arl-new-order');
  const sections=qa<HTMLElement>(':scope section',form);
  const clientSection=sections.find(s=>text(q('h2',s)).includes('Dados do cliente'));
  if(clientSection) installClientSearch(clientSection);
  const items=sections.find(s=>text(q('h2',s)).includes('Serviços / Itens da OS')); if(items) installServiceSearch(items);
  const photo=sections.find(s=>text(q('h2',s)).includes('Fotos do equipamento')); if(photo) installCameraForExistingInput(photo);
}

function installClientSearch(section:HTMLElement){
  if(q('.arl-client-search',section)) return;
  const select=q<HTMLSelectElement>('select',section); if(!select) return; select.classList.add('arl-hidden-select');
  select.addEventListener('change',()=>{if(select.value) void loadClient(Number(select.value)).then(c=>window.__arlSelectedClient=c)});
  const inline=select.closest<HTMLElement>('.inline'); if(!inline) return;
  const wrapper=document.createElement('div');wrapper.className='arl-client-search';
  wrapper.innerHTML='<label><span class="arl-search-icon">⌕</span><input type="search" autocomplete="off" placeholder="Buscar por nome, telefone ou CPF/CNPJ"><span class="arl-client-search-state"></span></label><div class="arl-client-results"></div>';
  inline.insertBefore(wrapper,select);
  const input=q<HTMLInputElement>('input',wrapper)!; const results=q<HTMLElement>('.arl-client-results',wrapper)!; const state=q<HTMLElement>('.arl-client-search-state',wrapper)!; let timer=0;
  input.addEventListener('input',()=>{window.clearTimeout(timer);const term=input.value.trim();if(term.length<2){results.innerHTML='';return}timer=window.setTimeout(async()=>{state.textContent='…';try{const page=await api('/clients?q='+encodeURIComponent(term));const list=(page.data||[]) as ClientHit[];results.innerHTML=list.length?list.map(c=>`<button type="button" data-id="${c.id}"><b>${escapeHtml(c.name)}</b><small>${escapeHtml(maskPhone(c.phone))} · ${escapeHtml(formatDoc(c.document))}</small></button>`).join(''):'<span>Nenhum cliente encontrado.</span>';qa<HTMLButtonElement>('button',results).forEach(btn=>btn.addEventListener('click',()=>{const c=list.find(x=>x.id===Number(btn.dataset.id));if(!c)return;window.__arlSelectedClient=c;input.value=c.name;select.value=String(c.id);select.dispatchEvent(new Event('change',{bubbles:true}));results.innerHTML='';renderSelectedClient(section,c)}))}catch(e){results.innerHTML='<span>Não foi possível pesquisar.</span>'}finally{state.textContent=''}},220)});
  if(select.value) void loadClient(Number(select.value)).then(c=>{window.__arlSelectedClient=c;input.value=c.name;renderSelectedClient(section,c)});
}
async function loadClient(id:number):Promise<ClientHit>{const result=await api('/clients/'+id);return result.client as ClientHit}
function renderSelectedClient(section:HTMLElement,c:ClientHit){let summary=q<HTMLElement>('.arl-selected-client',section);if(!summary){summary=document.createElement('div');summary.className='arl-selected-client';section.append(summary)}summary.innerHTML=`<b>${escapeHtml(c.name)}</b><small>${escapeHtml(maskPhone(c.phone))} · ${escapeHtml(formatDoc(c.document))}</small>`}

function installServiceSearch(section:HTMLElement){
  const pills=q<HTMLElement>('.opening-catalog',section); if(!pills || q('.arl-service-search',section)) return;
  const field=document.createElement('label');field.className='arl-service-search';field.innerHTML='<span>⌕</span><input type="search" placeholder="Pesquisar serviço cadastrado">';pills.before(field);
  const input=q<HTMLInputElement>('input',field)!; input.addEventListener('input',()=>{const term=input.value.trim().toLowerCase();qa<HTMLButtonElement>('button',pills).forEach(btn=>{btn.hidden=!!term&&!text(btn).toLowerCase().includes(term)})});
  pills.classList.add('arl-service-catalog');
}

function installCameraForExistingInput(section:HTMLElement){
  if(q('.arl-camera-button',section)) return;
  const input=q<HTMLInputElement>('input[type="file"]',section); if(!input) return;
  const button=document.createElement('button');button.type='button';button.className='arl-camera-button';button.textContent='◉  Usar câmera';button.addEventListener('click',()=>openCamera(file=>assignFile(input,file)));section.append(button);
}
function assignFile(input:HTMLInputElement,file:File){const dt=new DataTransfer();dt.items.add(file);input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}))}

function openCamera(onFile:(file:File)=>void){
  const modal=document.createElement('div');modal.className='arl-camera-modal';modal.innerHTML='<div class="arl-camera-card"><button class="arl-camera-close" type="button">×</button><h2>Capturar foto</h2><p>A imagem será anexada diretamente à ordem de serviço.</p><video autoplay playsinline muted></video><div class="arl-camera-error"></div><div class="arl-camera-actions"><button type="button" data-cancel>Cancelar</button><button type="button" data-shot>◉ Tirar foto</button></div></div>';document.body.append(modal);
  const video=q<HTMLVideoElement>('video',modal)!;const error=q<HTMLElement>('.arl-camera-error',modal)!;let stream:MediaStream|null=null;
  const close=()=>{stream?.getTracks().forEach(t=>t.stop());modal.remove()};q('[data-cancel]',modal)?.addEventListener('click',close);q('.arl-camera-close',modal)?.addEventListener('click',close);
  q('[data-shot]',modal)?.addEventListener('click',()=>{if(!video.videoWidth)return;const canvas=document.createElement('canvas');canvas.width=video.videoWidth;canvas.height=video.videoHeight;canvas.getContext('2d')?.drawImage(video,0,0);canvas.toBlob(blob=>{if(!blob)return;onFile(new File([blob],`camera-${Date.now()}.webp`,{type:'image/webp'}));close()},'image/webp',.86)});
  void navigator.mediaDevices?.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false}).then(s=>{stream=s;video.srcObject=s}).catch(e=>{error.textContent=e?.message||'Não foi possível acessar a câmera.'});
}

function enhanceOrderView(){
  const h=qa<HTMLHeadingElement>('h1').find(x=>text(x).startsWith('OS #')); if(!h) return;
  const title=h.closest<HTMLElement>('.title'); if(title) titleEyebrow(title,'ORDEM DE SERVIÇO'); q('.detail-grid')?.classList.add('arl-order-detail');
  qa<HTMLElement>('.detail-grid section').forEach(section=>{const heading=text(q('h2',section));if(heading==='Fotos') installOrderPhotoTools(section);if(heading==='Checklist' && text(section).includes('100% OK')) section.classList.add('arl-checklist-ok')});
}
function installOrderPhotoTools(section:HTMLElement){
  if(q('.arl-order-photo-tools',section) || !window.__arlCurrentOrderId) return;
  const tools=document.createElement('div');tools.className='arl-order-photo-tools';tools.innerHTML='<label>↑ Enviar foto<input type="file" accept="image/jpeg,image/png,image/webp" capture="environment"></label><button type="button">◉ Usar câmera</button>';const photos=q('.photos',section);section.insertBefore(tools,photos);
  const input=q<HTMLInputElement>('input',tools)!;input.addEventListener('change',()=>void uploadOrderPhoto(input.files?.[0],section));q<HTMLButtonElement>('button',tools)?.addEventListener('click',()=>openCamera(file=>void uploadOrderPhoto(file,section)));
}
async function uploadOrderPhoto(file:File|undefined,section:HTMLElement){if(!file||!window.__arlCurrentOrderId)return;const fd=new FormData();fd.append('photo',file);const photo=await api(`/orders/${window.__arlCurrentOrderId}/photos`,{method:'POST',body:fd});const photos=q<HTMLElement>('.photos',section);if(photos){qa('p',photos).forEach(x=>x.remove());const img=document.createElement('img');img.src=`/api/orders/${window.__arlCurrentOrderId}/photos/${photo.id}`;photos.append(img)}}

async function showOrderOpened(created:any){
  const clientId=Number(q<HTMLSelectElement>('form.os-form select')?.value||0);let client=window.__arlSelectedClient;
  if(!client && clientId) try{client=await loadClient(clientId)}catch{}
  if(!client)return;
  let settings:any={};try{settings=await api('/operational-settings')}catch{}
  const source=settings.order_opened_whatsapp||'Olá {{nome_cliente}}, seu chamado foi aberto com o número {{numero_os}}. Logo avaliaremos seu item e notificaremos novas atualizações do andamento do serviço.';
  const message=template(source,{nome_cliente:client.name,numero_os:created.number,empresa:settings.company_name||'ARL Informática'});
  q('.arl-order-opened-modal')?.remove();const modal=document.createElement('div');modal.className='arl-order-opened-modal';modal.innerHTML=`<div><span class="arl-success-icon">✓</span><h2>OS #${escapeHtml(created.number)} aberta com sucesso</h2><p>O chamado foi registrado. Você pode avisar o cliente pelo WhatsApp agora.</p><blockquote>${escapeHtml(message)}</blockquote><small>O texto padrão pode ser alterado em Configurações → Mensagens e WhatsApp.</small><section><button type="button">Continuar na OS</button><a target="_blank" rel="noreferrer">NOTIFICAR PELO WHATSAPP</a></section></div>`;document.body.append(modal);q<HTMLButtonElement>('button',modal)?.addEventListener('click',()=>modal.remove());const link=q<HTMLAnchorElement>('a',modal)!;link.href=whatsapp(client.phone,message);link.addEventListener('click',()=>setTimeout(()=>modal.remove(),250));
}

function enhanceServices(){
  const h=qa<HTMLHeadingElement>('h1').find(x=>text(x)==='Serviços e Produtos'); if(!h) return;const title=h.closest<HTMLElement>('.title');if(title) titleEyebrow(title,'CATÁLOGO ARL');
  const card=qa<HTMLElement>('.admin-list').find(x=>text(q('h2',x))==='Serviços e Produtos');if(card){card.classList.add('arl-service-admin');const heading=q<HTMLHeadingElement>('h2',card);if(heading)heading.textContent='Novo serviço ou produto';qa<HTMLElement>('article',card).forEach(a=>a.classList.add('arl-service-row'))}
}

function enhancePostSale(){
  const h=qa<HTMLHeadingElement>('h1').find(x=>text(x)==='Pós-Venda'); if(!h) return;h.textContent='Pós-Venda & Reputação';const title=h.closest<HTMLElement>('.title');if(title) titleEyebrow(title,'RELACIONAMENTO ARL');
  const panel=q<HTMLElement>('.post-sale'); if(!panel)return;panel.classList.add('arl-post-sale-panel');
  if(!q('.arl-post-sale-editor')) void createPostSaleEditor(panel);
  if(!q('.arl-post-toolbar')) createPostToolbar(panel);
  qa<HTMLElement>('article',panel).forEach(article=>{
    if(!q('.arl-post-avatar',article)){const info=article.firstElementChild as HTMLElement|null;const name=text(q('strong',info||article));const avatar=document.createElement('span');avatar.className='arl-post-avatar';avatar.textContent=(name||'A').slice(0,1).toUpperCase();info?.prepend(avatar)}
    qa<HTMLElement>('.post-action',article).forEach((action,index)=>action.classList.add(`arl-post-action-${index+1}`));
  });
}
async function createPostSaleEditor(panel:HTMLElement){
  const editor=document.createElement('section');editor.className='arl-post-sale-editor';editor.innerHTML='<div class="arl-google-card"><b>★ Google Meu Negócio</b><small>Link usado no pedido de avaliação.</small></div><label>Link de avaliação<input data-google readonly></label><h2>Modelos de Mensagem</h2><p>Edite aqui os textos do Pós-Venda.</p><label>1. Feedback<textarea data-key="post_sale_follow_up"></textarea></label><label>2. Pedido de avaliação<textarea data-key="post_sale_google"></textarea></label><label>3. Instagram<textarea data-key="post_sale_instagram"></textarea></label><button type="button" data-save>Salvar modelos</button><span data-status></span>';
  panel.before(editor);try{const data=await api('/post-sales/settings');(q<HTMLInputElement>('[data-google]',editor)!).value=data.google_review||'';qa<HTMLTextAreaElement>('textarea[data-key]',editor).forEach(area=>area.value=data[area.dataset.key!]||'');q<HTMLButtonElement>('[data-save]',editor)?.addEventListener('click',async()=>{const payload:Object=Object.fromEntries(qa<HTMLTextAreaElement>('textarea[data-key]',editor).map(area=>[area.dataset.key!,area.value]));const status=q<HTMLElement>('[data-status]',editor)!;status.textContent='Salvando…';try{await api('/post-sales/settings',{method:'PUT',body:JSON.stringify(payload)});status.textContent='Modelos salvos.'}catch(e:any){status.textContent=e.message}})}catch{editor.remove()}
}
function createPostToolbar(panel:HTMLElement){
  const toolbar=document.createElement('div');toolbar.className='arl-post-toolbar';toolbar.innerHTML='<label><span>⌕</span><input type="search" placeholder="Buscar por cliente ou OS…"></label><div><button type="button" data-view="cards" class="active">▦ Cards</button><button type="button" data-view="list">☷ Lista</button></div>';panel.before(toolbar);const input=q<HTMLInputElement>('input',toolbar)!;input.addEventListener('input',()=>filterPostSale(panel,input.value));qa<HTMLButtonElement>('[data-view]',toolbar).forEach(btn=>btn.addEventListener('click',()=>{qa('[data-view]',toolbar).forEach(x=>x.classList.remove('active'));btn.classList.add('active');panel.classList.toggle('arl-post-list',btn.dataset.view==='list')}));
}
function filterPostSale(panel:HTMLElement,term:string){const needle=term.trim().toLowerCase();qa<HTMLElement>('article',panel).forEach(a=>a.hidden=!!needle&&!text(a).toLowerCase().includes(needle))}

const settingsSections=[
  ['company','Empresa','Dados institucionais, endereço e links.'],['identity','Identidade Visual','Logomarca e padrão oficial ARL.'],['orders','Ordens de Serviço','Catálogos, checklist e garantia.'],['messages','Mensagens e WhatsApp','Mensagem padrão de abertura da OS.'],['documents','Orçamentos e Documentos','Termos, orçamento e laudos.'],['finance','Financeiro','Parâmetros gerais do financeiro.'],['notifications','Notificações','Central interna e Web Push.'],['backup','Backup e Restauração','Backup manual, automático e restauração.'],['system','Sistema e Diagnóstico','Saúde, versão e hospedagem.'],['storage','Armazenamento','Uso de fotos e limpeza segura.']
] as const;

function enhanceSettings(){
  const h=qa<HTMLHeadingElement>('h1').find(x=>text(x)==='Configurações'); if(!h)return;const title=h.closest<HTMLElement>('.title');if(title)titleEyebrow(title,'ADMINISTRAÇÃO');
  q('.setting-cards')?.classList.add('arl-hide-legacy-settings-cards');
  const form=q<HTMLFormElement>('form.settings-form'); if(!form)return;
  tagSettingsForm(form);tagSettingsExtras();
  if(!q('.arl-settings-tabs')) createSettingsTabs(form);
  if(!q('.arl-opening-message-panel')) void createOpeningMessagePanel(form);
  if(!q('.arl-fixed-brand-note')){const identity=qa<HTMLHeadingElement>('h2',form).find(x=>text(x)==='Identidade Visual');if(identity){const note=document.createElement('div');note.className='arl-fixed-brand-note';const img=brandImage();note.append(img);const copy=document.createElement('div');copy.innerHTML='<b>Identidade oficial ARL</b><p>O aplicativo usa vermelho, preto e branco com degradê como padrão fixo. O seletor de cores foi removido.</p>';note.append(copy);identity.after(note)}}
  applySettingsSection(form,(q<HTMLButtonElement>('.arl-settings-tab.active')?.dataset.section)||'company');
}
function tagSettingsForm(form:HTMLFormElement){let current='';for(const child of Array.from(form.children) as HTMLElement[]){if(child.tagName==='H2'){const label=text(child);current=label==='Dados da Empresa'?'company':label==='Identidade Visual'?'identity':label==='Documentos'?'documents':label==='Garantia Geral'?'orders':label.startsWith('Pós-Venda')?'hidden':label.startsWith('Layout')?'hidden':current}if(current)child.dataset.arlSettingsSection=current;if(child.classList.contains('actions'))child.dataset.arlSettingsSection='global'}}
function tagSettingsExtras(){
  qa<HTMLElement>('.infra-grid > .form-card').forEach(card=>{const h=text(q('h2',card));card.dataset.arlSettingsSection=h.includes('Backup')?'backup':h.includes('Sistema')||h.includes('Hospedagem')?'system':'system'});
  q<HTMLElement>('.report-settings')?.setAttribute('data-arl-settings-section','documents');
  q<HTMLElement>('.push-settings')?.setAttribute('data-arl-settings-section','notifications');
  qa<HTMLElement>('.admin-list').forEach(card=>{const h=text(q('h2',card));if(['Equipamentos','Fabricantes','Checklist de Entrada'].includes(h))card.dataset.arlSettingsSection='orders';if(h==='Fotos e Armazenamento')card.dataset.arlSettingsSection='storage'});
}
function createSettingsTabs(form:HTMLFormElement){const tabs=document.createElement('div');tabs.className='arl-settings-tabs';tabs.innerHTML=settingsSections.map(([id,label,desc],i)=>`<button type="button" class="arl-settings-tab ${i===0?'active':''}" data-section="${id}"><span>${iconForSettings(id)}</span><span><b>${label}</b><small>${desc}</small></span><i>⌄</i></button>`).join('');form.before(tabs);qa<HTMLButtonElement>('.arl-settings-tab',tabs).forEach(btn=>btn.addEventListener('click',()=>{const was=btn.classList.contains('active');qa('.arl-settings-tab',tabs).forEach(x=>x.classList.remove('active'));if(!was)btn.classList.add('active');applySettingsSection(form,was?'':btn.dataset.section||'')}))}
function iconForSettings(id:string){return ({company:'▣',identity:'◆',orders:'▤',messages:'◉',documents:'▧',finance:'$',notifications:'♢',backup:'▦',system:'⌁',storage:'▥'} as Record<string,string>)[id]||'•'}
function applySettingsSection(form:HTMLFormElement,id:string){tagSettingsForm(form);tagSettingsExtras();qa<HTMLElement>('[data-arl-settings-section]').forEach(el=>{const section=el.dataset.arlSettingsSection;el.hidden=section!=='global'&&section!==id});const custom=q<HTMLElement>('.arl-opening-message-panel');if(custom)custom.hidden=id!=='messages';const finance=q<HTMLElement>('.arl-finance-settings-note');if(finance)finance.hidden=id!=='finance';if(!finance){const note=document.createElement('div');note.className='arl-finance-settings-note';note.innerHTML='<b>Financeiro</b><p>Pagamentos, parcelas e A Receber permanecem no menu Financeiro. Configurações fica somente com parâmetros globais.</p>';form.before(note);note.hidden=id!=='finance'}}
async function createOpeningMessagePanel(form:HTMLFormElement){const panel=document.createElement('section');panel.className='arl-opening-message-panel';panel.hidden=true;panel.innerHTML='<h2>Mensagem de abertura da OS</h2><p>Use as variáveis <code>{{nome_cliente}}</code>, <code>{{numero_os}}</code> e <code>{{empresa}}</code>.</p><textarea></textarea><div class="arl-message-preview"></div><button type="button">Salvar mensagem</button><span></span>';form.before(panel);try{let settings=await api('/settings');const area=q<HTMLTextAreaElement>('textarea',panel)!;area.value=settings.order_opened_whatsapp||'';const preview=q<HTMLElement>('.arl-message-preview',panel)!;const render=()=>preview.textContent=template(area.value,{nome_cliente:'Cliente Exemplo',numero_os:'0000123',empresa:settings.trade_name||settings.company_name||'ARL Informática'});render();area.addEventListener('input',render);q<HTMLButtonElement>('button',panel)?.addEventListener('click',async()=>{const status=q<HTMLElement>('span:last-child',panel)!;status.textContent='Salvando…';try{settings={...settings,order_opened_whatsapp:area.value};await api('/settings',{method:'PUT',body:JSON.stringify(settings)});status.textContent='Mensagem salva.'}catch(e:any){status.textContent=e.message}})}catch{panel.innerHTML='<p>Não foi possível carregar a mensagem de abertura.</p>'}}

function enhanceServicesSettingsBoundary(){
  // Configurações mantém catálogos técnicos agrupados; o menu Serviços continua com o catálogo comercial principal.
  if(text(q('h1'))==='Configurações') qa<HTMLElement>('.admin-list').forEach(x=>x.classList.add('arl-settings-admin-card'));
}

function runEnhancements(){installFixedTheme();enhanceShell();enhanceDashboard();enhanceClients();enhanceNewOrder();enhanceOrderView();enhanceServices();enhancePostSale();enhanceSettings();enhanceServicesSettingsBoundary()}

installFixedTheme();installFetchObserver();
const observer=new MutationObserver(()=>{window.requestAnimationFrame(runEnhancements)});
observer.observe(document.documentElement,{childList:true,subtree:true});
document.addEventListener('DOMContentLoaded',runEnhancements);runEnhancements();
