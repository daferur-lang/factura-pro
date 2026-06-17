'use strict';

const STRIPE_LINK = 'https://buy.stripe.com/6oU4gz0nU5uu1DW5Aq8Vi07';

const S = { PROFILE:'fp_profile', DOCS:'fp_docs', COUNTERS:'fp_counters', PLAN:'fp_plan' };
const FREE_LIMIT = 7;
const ESTADOS = {
  borrador:  { label:'Borrador',  cls:'badge-borrador' },
  enviado:   { label:'Enviado',   cls:'badge-enviado' },
  aceptado:  { label:'Aceptado',  cls:'badge-aceptado' },
  rechazado: { label:'Rechazado', cls:'badge-rechazado' },
  pagado:    { label:'Pagado',    cls:'badge-pagado' }
};

const load = (k, fb) => { try { const v=localStorage.getItem(k); return v?JSON.parse(v):fb; } catch{ return fb; } };
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const loadDocs = () => load(S.DOCS, []);
const saveDocs = (d) => save(S.DOCS, d);
const loadProfile = () => load(S.PROFILE, {});
const loadPlan = () => load(S.PLAN, { pro:false, month:'', count:0 });

function getCounters() { return load(S.COUNTERS, { p:0, f:0 }); }
function nextNum(type) {
  const c = getCounters();
  const year = new Date().getFullYear();
  if(type==='presupuesto'){ c.p++; save(S.COUNTERS, c); return `P-${year}-${String(c.p).padStart(3,'0')}`; }
  else { c.f++; save(S.COUNTERS, c); return `F-${year}-${String(c.f).padStart(3,'0')}`; }
}

function isPro() { return loadPlan().pro; }
function canCreate() {
  if(isPro()) return true;
  const plan = loadPlan(); const month = ym();
  if(plan.month !== month) return true;
  return plan.count < FREE_LIMIT;
}
function useSlot() {
  if(isPro()) return;
  const plan = loadPlan(); const month = ym();
  if(plan.month !== month) { plan.month=month; plan.count=0; }
  plan.count++; save(S.PLAN, plan);
}
function ym() { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; }
function usedThisMonth() { const plan=loadPlan(); if(plan.month!==ym()) return 0; return plan.count; }

function fmt(n) { return (n||0).toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2})+' €'; }
function fmtDate(d) { if(!d) return '—'; const [y,m,day]=d.split('-'); return `${day}/${m}/${y}`; }
function today() { return new Date().toISOString().split('T')[0]; }
function in30() { const d=new Date(); d.setDate(d.getDate()+30); return d.toISOString().split('T')[0]; }
function uid() { return Date.now().toString(36)+Math.random().toString(36).slice(2,7); }
function showToast(msg) { const t=document.getElementById('toast'); t.textContent=msg; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),2500); }
function showOverlay(id) { document.getElementById(id).classList.remove('hidden'); }
function hideOverlay(id) { document.getElementById(id).classList.add('hidden'); }

let state = { tab:'presupuestos', editId:null, detailId:null, iva:21 };

const VIEWS = { home:'vHome', form:'vForm', detail:'vDetail', settings:'vSettings' };
function navigate(view, opts={}) {
  Object.values(VIEWS).forEach(id => { const el=document.getElementById(id); if(el) el.classList.remove('active'); });
  const el=document.getElementById(VIEWS[view]); if(el) el.classList.add('active');
  const backBtn=document.getElementById('backBtn');
  const hdrSettings=document.getElementById('hdrSettingsBtn');
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  if(view==='home') {
    backBtn.style.display='none'; hdrSettings.style.display='flex';
    document.getElementById('hdrTitle').textContent='Facturas Pro';
    document.querySelector('[data-nav="home"]')?.classList.add('active');
    renderHome();
  } else if(view==='form') {
    backBtn.style.display='flex'; hdrSettings.style.display='none';
    const tipoForm=opts.editId?(loadDocs().find(d=>d.id===opts.editId)?.tipo||state.tab.slice(0,-1)):state.tab.slice(0,-1);
    document.getElementById('hdrTitle').textContent=opts.editId?'Editar':tipoForm==='factura'?'Nueva factura':'Nuevo presupuesto';
    state.editId=opts.editId||null; state.iva=21; renderForm(opts.editId);
  } else if(view==='detail') {
    backBtn.style.display='flex'; hdrSettings.style.display='none';
    state.detailId=opts.id; renderDetail(opts.id);
  } else if(view==='settings') {
    backBtn.style.display='none'; hdrSettings.style.display='none';
    document.getElementById('hdrTitle').textContent='Perfil';
    document.querySelector('[data-nav="settings"]')?.classList.add('active');
    renderSettings();
  }
}

function renderHome() { document.getElementById('hdrTitle').textContent='Facturas Pro'; renderStats(); renderDocList(); }

function renderStats() {
  const docs=loadDocs(); const month=ym();
  const thisMonth=docs.filter(d=>ym_of(d.fecha)===month&&d.tipo==='factura');
  const totalMes=thisMonth.reduce((s,d)=>s+d.total,0);
  const pendiente=docs.filter(d=>d.tipo==='factura'&&d.estado!=='pagado').reduce((s,d)=>s+d.total,0);
  document.getElementById('statsStrip').innerHTML=`
    <div class="stat-item"><div class="stat-val">${fmt(totalMes)}</div><div class="stat-lbl">Facturado este mes</div></div>
    <div class="stat-item"><div class="stat-val">${fmt(pendiente)}</div><div class="stat-lbl">Pendiente de cobro</div></div>
    <div class="stat-item"><div class="stat-val">${docs.filter(d=>d.tipo==='factura').length}</div><div class="stat-lbl">Facturas totales</div></div>`;
}
function ym_of(dateStr) { if(!dateStr) return ''; const [y,m]=dateStr.split('-'); return `${y}-${m}`; }

function renderDocList() {
  const docs=loadDocs().filter(d=>d.tipo===state.tab.slice(0,-1));
  const docList=document.getElementById('docList');
  const empty=document.getElementById('emptyState');
  document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active',t.dataset.t===state.tab));
  if(!docs.length) { docList.innerHTML=''; empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');
  const sorted=[...docs].sort((a,b)=>b.fecha.localeCompare(a.fecha));
  docList.innerHTML=sorted.map(d=>`
    <div class="doc-card" data-id="${d.id}">
      <div class="doc-card-top">
        <div><div class="doc-card-cliente">${esc(d.cliente.nombre||'—')}</div><div class="doc-card-num">${d.numero}</div></div>
        <span class="badge ${ESTADOS[d.estado]?.cls||''}">${ESTADOS[d.estado]?.label||d.estado}</span>
      </div>
      <div class="doc-card-bottom"><span class="doc-card-total">${fmt(d.total)}</span><span class="doc-card-date">${fmtDate(d.fecha)}</span></div>
    </div>`).join('');
  docList.querySelectorAll('.doc-card').forEach(card=>card.addEventListener('click',()=>navigate('detail',{id:card.dataset.id})));
}

let lines=[];
function renderForm(editId) {
  const doc=editId?loadDocs().find(d=>d.id===editId):null;
  lines=doc?doc.lineas.map(l=>({...l})):[newLine()];
  state.iva=doc?doc.iva:21;
  document.getElementById('f-cNombre').value=doc?.cliente.nombre||'';
  document.getElementById('f-cNif').value=doc?.cliente.nif||'';
  document.getElementById('f-cEmail').value=doc?.cliente.email||'';
  document.getElementById('f-cDir').value=doc?.cliente.direccion||'';
  document.getElementById('f-fecha').value=doc?.fecha||today();
  document.getElementById('f-vence').value=doc?.vencimiento||in30();
  document.getElementById('f-notas').value=doc?.notas||'';
  const tipoActual=editId?(loadDocs().find(d=>d.id===editId)?.tipo||state.tab.slice(0,-1)):state.tab.slice(0,-1);
  document.getElementById('submitBtn').textContent=editId?'Guardar cambios':tipoActual==='factura'?'Guardar factura':'Guardar presupuesto';
  document.querySelectorAll('.iva-btn').forEach(b=>b.classList.toggle('active',Number(b.dataset.v)===state.iva));
  renderLines();
}

function newLine() { return {id:uid(),desc:'',qty:1,price:0}; }

function renderLines() {
  const wrap=document.getElementById('linesWrap');
  wrap.innerHTML=lines.map((l,i)=>`
    <div class="line-item" data-lid="${l.id}">
      <div class="line-top">
        <div class="line-desc"><input class="inp" type="text" placeholder="Descripción *" value="${esc(l.desc)}" data-field="desc" data-i="${i}"></div>
        ${lines.length>1?`<button type="button" class="line-del" data-del="${i}" aria-label="Eliminar"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>`:''}
      </div>
      <div class="line-bottom">
        <div class="line-qty"><label class="lbl">Cantidad</label><input class="inp" type="number" min="0" step="any" value="${l.qty}" data-field="qty" data-i="${i}"></div>
        <div class="line-price"><label class="lbl">Precio (€)</label><input class="inp" type="number" min="0" step="any" value="${l.price}" data-field="price" data-i="${i}"></div>
        <div class="line-total">${fmt(l.qty*l.price)}</div>
      </div>
    </div>`).join('');
  wrap.querySelectorAll('input[data-field]').forEach(inp=>inp.addEventListener('input',()=>{
    const i=Number(inp.dataset.i); const f=inp.dataset.field;
    if(f==='desc') lines[i].desc=inp.value; else lines[i][f]=parseFloat(inp.value)||0;
    updateTotals();
    wrap.querySelector(`[data-lid="${lines[i].id}"] .line-total`).textContent=fmt(lines[i].qty*lines[i].price);
  }));
  wrap.querySelectorAll('[data-del]').forEach(btn=>btn.addEventListener('click',()=>{ lines.splice(Number(btn.dataset.del),1); renderLines(); updateTotals(); }));
  updateTotals();
}

function updateTotals() {
  const sub=lines.reduce((s,l)=>s+l.qty*l.price,0);
  const ivaAmt=sub*state.iva/100;
  document.getElementById('tSubtotal').textContent=fmt(sub);
  document.getElementById('tIvaLabel').textContent=`IVA (${state.iva}%)`;
  document.getElementById('tIva').textContent=fmt(ivaAmt);
  document.getElementById('tTotal').textContent=fmt(sub+ivaAmt);
}
function calcTotals() { const sub=lines.reduce((s,l)=>s+l.qty*l.price,0); const ivaAmt=sub*state.iva/100; return {subtotal:sub,ivaAmt,total:sub+ivaAmt}; }

function renderDetail(id) {
  const doc=loadDocs().find(d=>d.id===id);
  if(!doc) { navigate('home'); return; }
  document.getElementById('hdrTitle').textContent=doc.tipo==='factura'?'Factura':'Presupuesto';
  const body=document.getElementById('detailBody');
  const statusInfo=ESTADOS[doc.estado];
  const watermarkHTML=!isPro()?`<span class="watermark-badge">PDF con marca de agua (plan gratis)</span>`:'';
  body.innerHTML=`
    <div class="detail-header">
      <div class="detail-num">${doc.numero} · <span class="badge ${doc.tipo==='factura'?'badge-factura':''}" style="background:rgba(255,255,255,.2);color:white">${doc.tipo==='factura'?'FACTURA':'PRESUPUESTO'}</span></div>
      <div class="detail-type">${esc(doc.cliente.nombre||'—')}</div>
      <div class="detail-total">${fmt(doc.total)}</div>
      <div class="detail-dates"><span>Emitido: ${fmtDate(doc.fecha)}</span>${doc.vencimiento?`<span>Vence: ${fmtDate(doc.vencimiento)}</span>`:''}</div>
    </div>
    <div class="detail-section">
      <div class="detail-section-title">Estado</div>
      <span class="badge ${statusInfo?.cls||''}" style="font-size:.85rem;padding:5px 12px">${statusInfo?.label||doc.estado}</span>
      ${watermarkHTML}
    </div>
    ${doc.cliente.nif||doc.cliente.email||doc.cliente.direccion?`
    <div class="detail-section">
      <div class="detail-section-title">Cliente</div>
      ${doc.cliente.nif?`<div style="font-size:.9rem;color:var(--gray-2)">NIF: ${esc(doc.cliente.nif)}</div>`:''}
      ${doc.cliente.email?`<div style="font-size:.9rem;color:var(--gray-2)">${esc(doc.cliente.email)}</div>`:''}
      ${doc.cliente.direccion?`<div style="font-size:.9rem;color:var(--gray-3)">${esc(doc.cliente.direccion)}</div>`:''}
    </div>`:''}
    <div class="detail-section">
      <div class="detail-section-title">Conceptos</div>
      ${doc.lineas.map(l=>`<div class="detail-line"><div><div class="detail-line-desc">${esc(l.desc||'Sin descripción')}</div><div class="detail-line-meta">${l.qty} × ${fmt(l.price)}</div></div><div class="detail-line-total">${fmt(l.qty*l.price)}</div></div>`).join('')}
    </div>
    <div class="detail-totals">
      <div class="total-row"><span>Subtotal</span><b>${fmt(doc.subtotal)}</b></div>
      <div class="total-row"><span>IVA (${doc.iva}%)</span><b>${fmt(doc.ivaAmt)}</b></div>
      <div class="total-row final"><span>TOTAL</span><b>${fmt(doc.total)}</b></div>
    </div>
    ${doc.notas?`<div class="detail-section"><div class="detail-section-title">Notas</div><p style="font-size:.9rem;color:var(--gray-2)">${esc(doc.notas)}</p></div>`:''}
    <div style="height:8px"></div>`;
  const bar=document.getElementById('actionBar');
  bar.innerHTML=`${doc.tipo==='presupuesto'&&doc.estado==='aceptado'&&!doc.convertidoEn?`<button class="btn-primary" id="aConvert">→ Factura</button>`:''}<button class="btn-primary" id="aPdf">PDF</button><button class="btn-ghost" id="aMenu">…</button>`;
  document.getElementById('aPdf')?.addEventListener('click',()=>generatePDF(doc));
  document.getElementById('aConvert')?.addEventListener('click',()=>convertToInvoice(id));
  document.getElementById('aMenu')?.addEventListener('click',()=>showDocMenu(id));
}

function showDocMenu(id) {
  showOverlay('mStatus');
  const doc=loadDocs().find(d=>d.id===id);
  const opts=document.getElementById('statusOpts');
  const estados=Object.entries(ESTADOS).filter(([k])=>doc.tipo==='factura'||!['pagado'].includes(k));
  opts.innerHTML=estados.map(([k,v])=>`<button class="status-opt" data-s="${k}"><span class="badge ${v.cls}">${v.label}</span></button>`).join('')+
    `<button class="status-opt" data-s="edit" style="color:var(--p)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>Editar</button>
     <button class="status-opt" data-s="delete" style="color:var(--danger)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>Eliminar</button>`;
  opts.querySelectorAll('[data-s]').forEach(btn=>btn.addEventListener('click',()=>{
    const s=btn.dataset.s; hideOverlay('mStatus');
    if(s==='edit') navigate('form',{editId:id});
    else if(s==='delete') confirmDelete(id);
    else setStatus(id,s);
  }));
}

function setStatus(id,status) {
  const docs=loadDocs(); const doc=docs.find(d=>d.id===id);
  if(doc){ doc.estado=status; saveDocs(docs); renderDetail(id); showToast('Estado actualizado'); }
}

function confirmDelete(id) {
  document.getElementById('mConfirmTitle').textContent='¿Eliminar documento?';
  document.getElementById('mConfirmMsg').textContent='Esta acción no se puede deshacer.';
  showOverlay('mConfirm');
  document.getElementById('mConfirmYes').onclick=()=>{
    hideOverlay('mConfirm');
    saveDocs(loadDocs().filter(d=>d.id!==id));
    showToast('Documento eliminado'); navigate('home');
  };
}

function convertToInvoice(id) {
  const docs=loadDocs(); const orig=docs.find(d=>d.id===id);
  if(!orig) return;
  if(!canCreate()) { showOverlay('mUpgrade'); return; }
  const inv={...orig,id:uid(),tipo:'factura',numero:nextNum('factura'),estado:'enviado',fecha:today(),vencimiento:in30(),creadoEn:new Date().toISOString()};
  orig.convertidoEn=new Date().toISOString();
  useSlot(); docs.push(inv); saveDocs(docs);
  showToast('Convertido a factura ✓'); navigate('detail',{id:inv.id});
}

function renderSettings() {
  const p=loadProfile();
  document.getElementById('s-nombre').value=p.nombre||'';
  document.getElementById('s-nif').value=p.nif||'';
  document.getElementById('s-email').value=p.email||'';
  document.getElementById('s-tel').value=p.telefono||'';
  document.getElementById('s-dir').value=p.direccion||'';
  document.getElementById('s-iban').value=p.iban||'';
  const used=usedThisMonth(); const pro=isPro();
  const pct=pro?100:Math.min(100,(used/FREE_LIMIT)*100);
  document.getElementById('planCard').innerHTML=`
    <h3 class="card-title">Plan</h3>
    <div class="plan-info"><span class="plan-name">${pro?'Pro':'Gratuito'}</span><span class="plan-badge ${pro?'pro':'free'}">${pro?'PRO':'FREE'}</span></div>
    ${!pro?`<div class="plan-meter"><div class="plan-meter-fill" style="width:${pct}%"></div></div><div class="plan-meter-txt">${used} de ${FREE_LIMIT} documentos este mes</div><button class="btn-primary w100" id="upgradeFromSettings">Activar Pro — 2,99 €/mes</button>`:`<p style="font-size:.88rem;color:var(--gray-3)">Acceso ilimitado activado. Gracias ❤️</p>`}`;
  document.getElementById('upgradeFromSettings')?.addEventListener('click',()=>showOverlay('mUpgrade'));
}

function generatePDF(doc) {
  const {jsPDF}=window.jspdf; const p=loadProfile();
  const pdf=new jsPDF({unit:'mm',format:'a4'});
  const W=210,mL=18,mR=18,col2=W-mR; let y=20; const pro=isPro();
  if(!pro) { pdf.setTextColor(220,220,220); pdf.setFontSize(52); pdf.setFont('helvetica','bold'); pdf.text('DEMO',W/2,148,{align:'center',angle:45}); pdf.setTextColor(0,0,0); }
  pdf.setFillColor(79,70,229); pdf.rect(0,0,W,36,'F');
  pdf.setFont('helvetica','bold'); pdf.setFontSize(16); pdf.setTextColor(255,255,255);
  pdf.text(p.nombre||'Mi Empresa',mL,15); pdf.setFontSize(9); pdf.setFont('helvetica','normal');
  if(p.nif) pdf.text(`NIF: ${p.nif}`,mL,22);
  if(p.email) pdf.text(p.email,mL,28);
  if(p.telefono) pdf.text(p.telefono,mL,33);
  pdf.setFont('helvetica','bold'); pdf.setFontSize(20); pdf.setTextColor(255,255,255);
  pdf.text(doc.tipo==='factura'?'FACTURA':'PRESUPUESTO',col2,14,{align:'right'});
  pdf.setFontSize(11); pdf.setFont('helvetica','normal');
  pdf.text(doc.numero,col2,22,{align:'right'}); pdf.setFontSize(9);
  pdf.text(`Fecha: ${fmtDate(doc.fecha)}`,col2,29,{align:'right'});
  if(doc.vencimiento) pdf.text(`Vence: ${fmtDate(doc.vencimiento)}`,col2,34,{align:'right'});
  y=46; pdf.setTextColor(0,0,0);
  pdf.setFont('helvetica','bold'); pdf.setFontSize(8); pdf.setTextColor(150,150,150);
  pdf.text('FACTURAR A',mL,y); y+=5;
  pdf.setTextColor(0,0,0); pdf.setFontSize(11); pdf.text(doc.cliente.nombre||'',mL,y); y+=5;
  pdf.setFont('helvetica','normal'); pdf.setFontSize(9);
  if(doc.cliente.nif){pdf.text(`NIF: ${doc.cliente.nif}`,mL,y);y+=4;}
  if(doc.cliente.email){pdf.text(doc.cliente.email,mL,y);y+=4;}
  if(doc.cliente.direccion){pdf.text(doc.cliente.direccion,mL,y);y+=4;}
  y+=6;
  pdf.setFillColor(243,244,246); pdf.rect(mL,y,W-mL-mR,8,'F');
  pdf.setFont('helvetica','bold'); pdf.setFontSize(9); pdf.setTextColor(107,114,128);
  pdf.text('DESCRIPCIÓN',mL+2,y+5.5); pdf.text('CANT.',138,y+5.5,{align:'center'});
  pdf.text('PRECIO',158,y+5.5,{align:'right'}); pdf.text('TOTAL',col2,y+5.5,{align:'right'}); y+=10;
  pdf.setFont('helvetica','normal'); pdf.setFontSize(9.5); pdf.setTextColor(17,24,39);
  doc.lineas.forEach((l,idx)=>{
    if(idx%2===1){pdf.setFillColor(249,250,251);pdf.rect(mL,y-1.5,W-mL-mR,7.5,'F');}
    pdf.text(l.desc||'',mL+2,y+4); pdf.text(String(l.qty),138,y+4,{align:'center'});
    pdf.text(fmt(l.price),158,y+4,{align:'right'}); pdf.text(fmt(l.qty*l.price),col2,y+4,{align:'right'});
    y+=8; if(y>240){pdf.addPage();y=20;}
  });
  y+=4;
  if(y+42>270){pdf.addPage();y=20;}
  const boxX=130; pdf.setDrawColor(229,231,235); pdf.setFillColor(255,255,255);
  pdf.roundedRect(boxX,y,W-mR-boxX,32,2,2,'FD');
  pdf.setFont('helvetica','normal'); pdf.setFontSize(9); pdf.setTextColor(107,114,128);
  pdf.text('Subtotal',boxX+4,y+8); pdf.text(`IVA (${doc.iva}%)`,boxX+4,y+16);
  pdf.setFont('helvetica','bold'); pdf.setFontSize(10); pdf.setTextColor(17,24,39);
  pdf.text('TOTAL',boxX+4,y+27);
  pdf.setFont('helvetica','normal'); pdf.setFontSize(9); pdf.setTextColor(107,114,128);
  pdf.text(fmt(doc.subtotal),col2,y+8,{align:'right'}); pdf.text(fmt(doc.ivaAmt),col2,y+16,{align:'right'});
  pdf.setFont('helvetica','bold'); pdf.setFontSize(11); pdf.setTextColor(79,70,229);
  pdf.text(fmt(doc.total),col2,y+27,{align:'right'}); y+=38;
  if(doc.notas){
    if(y+24>270){pdf.addPage();y=20;}
    pdf.setFont('helvetica','bold'); pdf.setFontSize(8); pdf.setTextColor(150,150,150);
    pdf.text('NOTAS',mL,y); y+=5;
    pdf.setFont('helvetica','normal'); pdf.setFontSize(9); pdf.setTextColor(55,65,81);
    const ls=pdf.splitTextToSize(doc.notas,W-mL-mR); pdf.text(ls,mL,y); y+=ls.length*5+4;
  }
  pdf.setFont('helvetica','normal'); pdf.setFontSize(8); pdf.setTextColor(156,163,175);
  if(p.iban) pdf.text(`IBAN: ${p.iban}`,mL,282);
  if(p.direccion) pdf.text(p.direccion,W/2,282,{align:'center'});
  pdf.text('Generado con Facturas Pro',col2,282,{align:'right'});
  pdf.save(`${doc.numero}.pdf`); showToast('PDF generado ✓');
}

function submitForm(e) {
  e.preventDefault();
  const nombre=document.getElementById('f-cNombre').value.trim();
  if(!nombre){showToast('El nombre del cliente es obligatorio');return;}
  const validLines=lines.filter(l=>l.desc.trim());
  if(!validLines.length){showToast('Añade al menos un concepto');return;}
  const isEdit=!!state.editId;
  if(!isEdit&&!canCreate()){showOverlay('mUpgrade');return;}
  const {subtotal,ivaAmt,total}=calcTotals();
  const docs=loadDocs();
  if(isEdit) {
    const doc=docs.find(d=>d.id===state.editId);
    if(doc){
      doc.cliente={nombre,nif:document.getElementById('f-cNif').value.trim(),email:document.getElementById('f-cEmail').value.trim(),direccion:document.getElementById('f-cDir').value.trim()};
      doc.lineas=validLines; doc.iva=state.iva; doc.subtotal=subtotal; doc.ivaAmt=ivaAmt; doc.total=total;
      doc.fecha=document.getElementById('f-fecha').value; doc.vencimiento=document.getElementById('f-vence').value;
      doc.notas=document.getElementById('f-notas').value.trim();
    }
    saveDocs(docs); showToast('Cambios guardados ✓'); navigate('detail',{id:state.editId});
  } else {
    useSlot();
    const tipo=state.tab.slice(0,-1);
    const doc={id:uid(),tipo,numero:nextNum(tipo),estado:'borrador',
      cliente:{nombre,nif:document.getElementById('f-cNif').value.trim(),email:document.getElementById('f-cEmail').value.trim(),direccion:document.getElementById('f-cDir').value.trim()},
      lineas:validLines,iva:state.iva,subtotal,ivaAmt,total,
      fecha:document.getElementById('f-fecha').value,vencimiento:document.getElementById('f-vence').value,
      notas:document.getElementById('f-notas').value.trim(),creadoEn:new Date().toISOString()};
    docs.push(doc); saveDocs(docs); showToast(tipo==='factura'?'Factura creada ✓':'Presupuesto creado ✓'); navigate('detail',{id:doc.id});
  }
}

function saveSettings() {
  const p={nombre:document.getElementById('s-nombre').value.trim(),nif:document.getElementById('s-nif').value.trim(),
    email:document.getElementById('s-email').value.trim(),telefono:document.getElementById('s-tel').value.trim(),
    direccion:document.getElementById('s-dir').value.trim(),iban:document.getElementById('s-iban').value.trim()};
  if(!p.nombre){showToast('El nombre es obligatorio');return;}
  save(S.PROFILE,p); showToast('Datos guardados ✓');
}

function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function initOnboarding() {
  const profile=loadProfile();
  if(profile.nombre) { hideOverlay('onboarding'); document.getElementById('shell').classList.remove('hidden'); navigate('home'); }
  document.getElementById('obForm').addEventListener('submit',e=>{
    e.preventDefault();
    const nombre=document.getElementById('ob-nombre').value.trim();
    const nif=document.getElementById('ob-nif').value.trim();
    if(!nombre||!nif) return;
    save(S.PROFILE,{nombre,nif,email:document.getElementById('ob-email').value.trim(),telefono:document.getElementById('ob-tel').value.trim()});
    hideOverlay('onboarding'); document.getElementById('shell').classList.remove('hidden'); navigate('home');
  });
}

function bindEvents() {
  document.getElementById('backBtn').addEventListener('click',()=>{
    const active=document.querySelector('.view.active');
    if(active?.id==='vDetail') navigate('home');
    else if(active?.id==='vForm') state.editId?navigate('detail',{id:state.editId}):navigate('home');
    else navigate('home');
  });
  document.getElementById('hdrSettingsBtn').addEventListener('click',()=>navigate('settings'));
  document.querySelectorAll('.nav-btn').forEach(btn=>btn.addEventListener('click',()=>{
    const nav=btn.dataset.nav;
    if(nav==='home') navigate('home');
    else if(nav==='new'){if(!canCreate()){showOverlay('mUpgrade');return;}navigate('form');}
    else if(nav==='settings') navigate('settings');
  }));
  document.getElementById('fabBtn').addEventListener('click',()=>{ if(!canCreate()){showOverlay('mUpgrade');return;} navigate('form'); });
  document.querySelectorAll('.tab').forEach(tab=>tab.addEventListener('click',()=>{ state.tab=tab.dataset.t; renderDocList(); }));
  document.getElementById('addLineBtn').addEventListener('click',()=>{ lines.push(newLine()); renderLines(); });
  document.querySelectorAll('.iva-btn').forEach(btn=>btn.addEventListener('click',()=>{
    state.iva=Number(btn.dataset.v);
    document.querySelectorAll('.iva-btn').forEach(b=>b.classList.toggle('active',Number(b.dataset.v)===state.iva));
    updateTotals();
  }));
  document.getElementById('docForm').addEventListener('submit',submitForm);
  document.getElementById('saveSettingsBtn').addEventListener('click',saveSettings);
  document.getElementById('upgradePay').addEventListener('click',()=>{
    window.open(STRIPE_LINK, '_blank');
  });
  document.getElementById('upgradeClose').addEventListener('click',()=>hideOverlay('mUpgrade'));
  document.getElementById('mConfirmNo').addEventListener('click',()=>hideOverlay('mConfirm'));
  document.getElementById('mStatusClose').addEventListener('click',()=>hideOverlay('mStatus'));
  document.querySelectorAll('.overlay').forEach(ov=>ov.addEventListener('click',e=>{ if(e.target===ov&&ov.id!=='onboarding') ov.classList.add('hidden'); }));
}

document.addEventListener('DOMContentLoaded',()=>{
  const params=new URLSearchParams(window.location.search);
  let justActivated=false;
  if(params.get('pro')==='1'&&!isPro()){
    const plan=loadPlan(); plan.pro=true; save(S.PLAN,plan);
    window.history.replaceState({},'',window.location.pathname);
    justActivated=true;
  }
  if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(()=>{});
  bindEvents(); initOnboarding();
  if(justActivated) setTimeout(()=>showToast('Plan Pro activado ✓'),400);
});