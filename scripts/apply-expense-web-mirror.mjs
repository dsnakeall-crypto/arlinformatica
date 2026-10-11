import fs from 'node:fs';
import postcss from 'postcss';

const src='resources/js/expense-control-page.tsx';
let component=fs.readFileSync(src,'utf8');
const before="    {tab === 'summary' && !detail && mobile && <ExpenseMobileSummary";
if(component.includes(before)){
  component=component.replace(before,"    {tab === 'summary' && !detail && <ExpenseMobileSummary");
  const start="    {tab === 'summary' && !detail && !mobile && <>";
  const end="    {(tab === 'debts' || tab === 'settled') && !detail && <>";
  const s=component.indexOf(start), e=component.indexOf(end,s);
  if(s===-1 || e===-1 || e<=s) throw new Error('Missing exact desktop summary boundaries');
  component=component.slice(0,s)+component.slice(e);
  component=component.replace('cg-clean-only" + (mobile ?', 'cg-clean-only" + (!mobile ? " cg-expense-web-mirror" : "") + (mobile ?');
  fs.writeFileSync(src,component);
}else if(!component.includes("!detail && <ExpenseMobileSummary")) throw new Error('Expense summary modification unexpected');

const output=postcss.root();
const spec=[
 ['resources/css/expense-control-mobile.css','base'],
 ['resources/css/expense-reference-mobile-2026.css','reference'],
 ['resources/css/expense-final-mobile.css','final'],
];
let count=0;
for(const [file,type] of spec){
  const input=postcss.parse(fs.readFileSync(file,'utf8'),{from:file});
  function extract(node){
    const children=[];
    for(const part of node.nodes||[]){
      if(part.type==='rule'){
        const valid=part.selectors.filter(s=>{
          if(type==='base') return /\.cgm-|\.cg-mobile-summary/.test(s);
          return s.includes('.layout-mobile') &&
              (s.includes('.cg-page.cg-mobile') || s.includes('.cg-page.cg-clean-only')) &&
              !/\.cg-navigation|\.arl-expense-bottom|\.cg-mobile\.cg-tabs/.test(s);
        });
        if(!valid.length) continue;
        const clone=part.clone();
        clone.selectors=valid.map(s=>{
          if(type==='base') return s.replaceAll('.cg-mobile', '.cg-expense-web-mirror').replaceAll('.cgm-', '.cgm-');
          return s.replaceAll('.layout-mobile.arl-expense-workspace','.layout-desktop')
            .replaceAll('.layout-mobile','.layout-desktop')
            .replaceAll('.cg-page.cg-mobile','.cg-page.cg-expense-web-mirror')
            .replaceAll('.cg-page.cg-clean-only','.cg-page.cg-expense-web-mirror.cg-clean-only');
        });
        children.push(clone);count++;
      }else if(part.type==='atrule' && part.nodes?.length){
        const nested=extract(part);
        if(nested.length){const clone=part.clone({nodes:[]});nested.forEach(n=>clone.append(n));children.push(clone)}
      }
    }
    return children;
  }
  extract(input).forEach(n=>output.append(n));
}
const header=`/* AUTOGERADO do visual MOBILE APROVADO do Controle de Gastos.
   Apenas Web/PC dentro .cg-expense-web-mirror; nunca altera o mobile.
   Gerado por scripts/apply-expense-web-mirror.mjs. NÃO converter interface
   em versão mobile: são compartilhados cartões e acabamento; a grid
   e a navegação continuam responsivas de computador. */\n`;
const overrides=`
/* Área Web mantém os menus, as ações e o espaço de computador. */
html body .shell.layout-desktop>main[data-arl-expense-control-react="1"]{
 min-width:0!important;background:linear-gradient(150deg,#e9f4fe 0%,#f0f6ff 52%,#f9eff6 100%)!important;
}
html body .shell.layout-desktop .cg-page.cg-expense-web-mirror{
 width:100%!important;max-width:100%!important;min-width:0!important;
 margin:0 auto!important;padding:16px clamp(12px,2.3vw,28px) 28px!important;
 color:#0e2855!important;font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif;
 --ref-navy:#0c2653;--ref-muted:#667fa9;--ref-red:#d9003e;
 --ref-line:rgba(187,209,247,.83);
}
html body .shell.layout-desktop .cg-expense-web-mirror .cg-navigation{
 display:block!important;margin:12px 0 20px!important;
}
html body .shell.layout-desktop .cg-expense-web-mirror .cg-tabs{
 display:flex!important;flex-wrap:wrap;gap:5px;
 padding:6px!important;border-radius:17px!important;
 background:linear-gradient(145deg,#ecf4ff,#dceafb)!important;border:1px solid #c4d6f2!important;
}
html body .shell.layout-desktop .cg-expense-web-mirror .cg-tabs button{
 min-height:41px;border:1px solid #c1d5f1;border-radius:13px;
 background:linear-gradient(145deg,#f9fcff,#e9f2ff);color:#214676;
}
html body .shell.layout-desktop .cg-expense-web-mirror .cg-tabs button.active{
 background:linear-gradient(155deg,#fc3464,#cf003b)!important;border-color:#cd0e43!important;
 color:#fff!important;
}
html body .shell.layout-desktop .cg-expense-web-mirror .cg-mobile-summary{
 display:grid!important;gap:16px!important;
}
html body .shell.layout-desktop .cg-expense-web-mirror .cgo-indicators{
 display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;
 gap:14px!important;margin:5px 0 0!important;
}
html body .shell.layout-desktop .cg-expense-web-mirror .cgo-indicators>.cgo-month{
 grid-column:1/-1!important;
}
html body .shell.layout-desktop .cg-expense-web-mirror .cgo-people{
 display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;
 gap:16px!important;margin:0!important;
}
html body .shell.layout-desktop .cg-expense-web-mirror .cg-invoice-grid{
 display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;
 gap:12px!important;
}
html body .shell.layout-desktop .cg-expense-web-mirror .cg-monthly-invoices{
 margin:6px 0 14px!important;
}
html body .shell.layout-desktop .cg-expense-web-mirror .cg-mobile-summary
 :is(.cgo-indicators,.cgo-people,.cg-monthly-invoices,.cg-invoice-grid){
 max-width:100%;min-width:0;
}
html body .shell.layout-desktop .cg-expense-web-mirror .arl-page-header{
 margin-bottom:14px!important;
}
html body .shell.layout-desktop .cg-expense-web-mirror :is(.cg-panel,.cg-institution,.cg-person-card){
 border-color:#c5d8f1;
}
/* Os cartões do mobile têm o mesmo desenho; somente as colunas se adaptam. */
@media(max-width:1180px){
 html body .shell.layout-desktop .cg-expense-web-mirror .cgo-indicators{grid-template-columns:repeat(2,minmax(0,1fr))!important}
 html body .shell.layout-desktop .cg-expense-web-mirror .cgo-people{grid-template-columns:1fr!important}
}
@media(max-width:700px){
 html body .shell.layout-desktop .cg-expense-web-mirror .cg-invoice-grid{grid-template-columns:1fr!important}
 html body .shell.layout-desktop .cg-expense-web-mirror .cgo-indicators{grid-template-columns:repeat(2,minmax(0,1fr))!important}
 html body .shell.layout-desktop .cg-expense-web-mirror .cgo-people{grid-template-columns:1fr!important}
 html body .shell.layout-desktop .cg-expense-web-mirror .cg-tabs{overflow-x:auto;flex-wrap:nowrap}
 html body .shell.layout-desktop .cg-expense-web-mirror .cg-tabs button{flex:0 0 auto}
}
`;
fs.writeFileSync('resources/css/expense-web-mobile-visual-20261010.css',header+output.toString()+overrides);
if(!component.includes("import '../css/expense-web-mobile-visual-20261010.css';")){
 component=component.replace("import '../css/expense-reference-mobile-2026.css';","import '../css/expense-reference-mobile-2026.css';\nimport '../css/expense-web-mobile-visual-20261010.css';");
 fs.writeFileSync(src,component);
}
console.log('Copied',count,'approved mobile visual rules to desktop scoped CSS');
