'use strict';

const STRIPE_LINK = 'https://buy.stripe.com/4gMeVdc6C6yybew3si8Vi08';

const S = { PROFILE:'fp_profile', DOCS:'fp_docs', COUNTERS:'fp_counters', PLAN:'fp_plan', CLIENTS:'fp_clients', CITAS:'fp_citas' };
const ESTADOS_CITA = {
  pendiente: { label:'Pendiente', cls:'cita-status--pendiente' },
  hecha:     { label:'Hecha',     cls:'cita-status--hecha' },
  cancelada: { label:'Cancelada', cls:'cita-status--cancelada' }
};
const WA_ICON_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.29-1.39a9.9 9.9 0 0 0 4.75 1.21h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.87 9.87 0 0 0 12.04 2zm0 1.67c2.2 0 4.27.86 5.82 2.41a8.2 8.2 0 0 1 2.42 5.83c0 4.55-3.7 8.24-8.25 8.24a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.14.82.84-3.06-.2-.32a8.18 8.18 0 0 1-1.26-4.38c0-4.55 3.7-8.21 8.24-8.21zm-4.53 4.7c-.17 0-.44.06-.67.32-.23.26-.87.85-.87 2.07 0 1.22.89 2.4 1.02 2.57.12.16 1.75 2.67 4.24 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.55.1.47-.07 1.46-.6 1.67-1.18.2-.58.2-1.07.14-1.18-.06-.1-.23-.16-.47-.28-.25-.13-1.46-.72-1.68-.8-.23-.08-.4-.13-.56.13-.17.26-.64.8-.79.97-.14.16-.29.18-.54.06-.25-.13-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.39-1.72-.14-.25-.02-.39.11-.51.11-.11.25-.29.37-.43.12-.15.16-.25.25-.42.08-.16.04-.31-.02-.43-.06-.13-.56-1.35-.77-1.85-.2-.48-.4-.42-.56-.42h-.44z"/></svg>';
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
const loadClients = () => load(S.CLIENTS, []);
const saveClients = (c) => save(S.CLIENTS, c);
const loadCitas = () => load(S.CITAS, []);
const saveCitas = (c) => save(S.CITAS, c);

function clientKey(nombre, nif) {
  const n=(nif||'').trim().toUpperCase();
  return n ? `nif:${n}` : `nombre:${(nombre||'').trim().toLowerCase()}`;
}
function upsertClientFromDoc(cliente) {
  if(!cliente?.nombre) return;
  const clients=loadClients();
  const key=clientKey(cliente.nombre,cliente.nif);
  const now=new Date().toISOString();
  const existing=clients.find(c=>clientKey(c.nombre,c.nif)===key);
  if(existing) {
    existing.nombre=cliente.nombre; existing.nif=cliente.nif; existing.email=cliente.email;
    existing.direccion=cliente.direccion; existing.actualizadoEn=now;
    if(cliente.telefono) existing.telefono=cliente.telefono;
  } else {
    clients.push({id:uid(),nombre:cliente.nombre,nif:cliente.nif||'',email:cliente.email||'',telefono:cliente.telefono||'',direccion:cliente.direccion||'',creadoEn:now,actualizadoEn:now});
  }
  saveClients(clients);
}

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

let state = { tab:'presupuestos', editId:null, detailId:null, iva:21, irpf:0, agendaDate:today() };
let formDirty = false;

const VIEWS = { home:'vHome', form:'vForm', detail:'vDetail', settings:'vSettings', clients:'vClients', agenda:'vAgenda' };
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
  } else if(view==='clients') {
    backBtn.style.display='flex'; hdrSettings.style.display='none';
    document.getElementById('hdrTitle').textContent='Clientes';
    renderClients();
  } else if(view==='agenda') {
    backBtn.style.display='none'; hdrSettings.style.display='none';
    document.getElementById('hdrTitle').textContent='Agenda';
    document.querySelector('[data-nav="agenda"]')?.classList.add('active');
    renderAgenda();
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
  state.irpf=doc?.irpf||0;
  document.getElementById('f-cNombre').value=doc?.cliente.nombre||'';
  document.getElementById('f-cNif').value=doc?.cliente.nif||'';
  document.getElementById('f-cEmail').value=doc?.cliente.email||'';
  document.getElementById('f-cTel').value=doc?.cliente.telefono||'';
  document.getElementById('f-cDir').value=doc?.cliente.direccion||'';
  document.getElementById('f-fecha').value=doc?.fecha||today();
  document.getElementById('f-vence').value=doc?.vencimiento||in30();
  document.getElementById('f-notas').value=doc?.notas||'';
  const tipoActual=editId?(loadDocs().find(d=>d.id===editId)?.tipo||state.tab.slice(0,-1)):state.tab.slice(0,-1);
  document.getElementById('submitBtn').textContent=editId?'Guardar cambios':tipoActual==='factura'?'Guardar factura':'Guardar presupuesto';
  document.querySelectorAll('.iva-btn:not(.irpf-btn)').forEach(b=>b.classList.toggle('active',Number(b.dataset.v)===state.iva));
  document.querySelectorAll('.irpf-btn').forEach(b=>b.classList.toggle('active',Number(b.dataset.v)===state.irpf));
  renderLines();
  formDirty=false;
  const suggestBox=document.getElementById('clientSuggest');
  suggestBox.classList.add('hidden'); suggestBox.innerHTML='';
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
    if(f==='desc') lines[i].desc=inp.value; else lines[i][f]=Math.max(0,parseFloat(inp.value)||0);
    formDirty=true;
    updateTotals();
    wrap.querySelector(`[data-lid="${lines[i].id}"] .line-total`).textContent=fmt(lines[i].qty*lines[i].price);
  }));
  wrap.querySelectorAll('[data-del]').forEach(btn=>btn.addEventListener('click',()=>{ lines.splice(Number(btn.dataset.del),1); formDirty=true; renderLines(); updateTotals(); }));
  updateTotals();
}

function updateTotals() {
  const sub=lines.reduce((s,l)=>s+l.qty*l.price,0);
  const ivaAmt=sub*state.iva/100;
  const irpfAmt=sub*state.irpf/100;
  document.getElementById('tSubtotal').textContent=fmt(sub);
  document.getElementById('tIvaLabel').textContent=`IVA (${state.iva}%)`;
  document.getElementById('tIva').textContent=fmt(ivaAmt);
  document.getElementById('tIrpfRow').classList.toggle('hidden',state.irpf<=0);
  document.getElementById('tIrpfLabel').textContent=`Retención IRPF (-${state.irpf}%)`;
  document.getElementById('tIrpf').textContent=`-${fmt(irpfAmt)}`;
  document.getElementById('tTotal').textContent=fmt(sub+ivaAmt-irpfAmt);
}
function calcTotals() {
  const sub=lines.reduce((s,l)=>s+l.qty*l.price,0);
  const ivaAmt=sub*state.iva/100;
  const irpfAmt=sub*state.irpf/100;
  return {subtotal:sub,ivaAmt,irpfAmt,total:sub+ivaAmt-irpfAmt};
}

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
      ${doc.cliente.telefono?`<div style="font-size:.9rem;color:var(--gray-2)">${esc(doc.cliente.telefono)}</div>`:''}
      ${doc.cliente.direccion?`<div style="font-size:.9rem;color:var(--gray-3)">${esc(doc.cliente.direccion)}</div>`:''}
    </div>`:''}
    <div class="detail-section">
      <div class="detail-section-title">Conceptos</div>
      ${doc.lineas.map(l=>`<div class="detail-line"><div><div class="detail-line-desc">${esc(l.desc||'Sin descripción')}</div><div class="detail-line-meta">${l.qty} × ${fmt(l.price)}</div></div><div class="detail-line-total">${fmt(l.qty*l.price)}</div></div>`).join('')}
    </div>
    <div class="detail-totals">
      <div class="total-row"><span>Subtotal</span><b>${fmt(doc.subtotal)}</b></div>
      <div class="total-row"><span>IVA (${doc.iva}%)</span><b>${fmt(doc.ivaAmt)}</b></div>
      ${doc.irpf?`<div class="total-row"><span>Retención IRPF (-${doc.irpf}%)</span><b>-${fmt(doc.irpfAmt)}</b></div>`:''}
      <div class="total-row final"><span>TOTAL</span><b>${fmt(doc.total)}</b></div>
    </div>
    ${doc.notas?`<div class="detail-section"><div class="detail-section-title">Notas</div><p style="font-size:.9rem;color:var(--gray-2)">${esc(doc.notas)}</p></div>`:''}
    <div style="height:8px"></div>`;
  const bar=document.getElementById('actionBar');
  const waDisabled=doc.cliente.telefono?'':'disabled';
  bar.innerHTML=`${doc.tipo==='presupuesto'&&doc.estado==='aceptado'&&!doc.convertidoEn?`<button class="btn-primary" id="aConvert">→ Factura</button>`:''}<button class="btn-primary" id="aPdf">PDF</button><button class="btn-wa" id="aWhatsapp" title="${doc.cliente.telefono?'Enviar por WhatsApp':'Añade el teléfono del cliente para enviar por WhatsApp'}" ${waDisabled}>${WA_ICON_SVG} WhatsApp</button><button class="btn-ghost" id="aMenu">…</button>`;
  document.getElementById('aPdf')?.addEventListener('click',()=>generatePDF(doc));
  document.getElementById('aConvert')?.addEventListener('click',()=>convertToInvoice(id));
  document.getElementById('aWhatsapp')?.addEventListener('click',()=>sendDocViaWhatsapp(doc));
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
  document.getElementById('mConfirmYes').textContent='Eliminar';
  document.getElementById('mConfirmYes').className='danger';
  showOverlay('mConfirm');
  document.getElementById('mConfirmYes').onclick=()=>{
    hideOverlay('mConfirm');
    saveDocs(loadDocs().filter(d=>d.id!==id));
    showToast('Documento eliminado'); navigate('home');
  };
}

function confirmLeaveForm(after) {
  if(!formDirty) { after(); return; }
  document.getElementById('mConfirmTitle').textContent='¿Salir sin guardar?';
  document.getElementById('mConfirmMsg').textContent='Tienes cambios sin guardar. Se perderán si sales ahora.';
  document.getElementById('mConfirmYes').textContent='Salir';
  document.getElementById('mConfirmYes').className='outline';
  showOverlay('mConfirm');
  document.getElementById('mConfirmYes').onclick=()=>{
    hideOverlay('mConfirm'); formDirty=false; after();
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

function renderClients() {
  const list=document.getElementById('clientsList');
  const empty=document.getElementById('clientsEmpty');
  const clients=[...loadClients()].sort((a,b)=>a.nombre.localeCompare(b.nombre,'es'));
  if(!clients.length) { list.innerHTML=''; empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');
  list.innerHTML=clients.map(c=>`
    <div class="doc-card" data-id="${c.id}">
      <div class="doc-card-top">
        <div><div class="doc-card-cliente">${esc(c.nombre)}</div><div class="doc-card-num">${esc(c.nif||'Sin NIF')}</div></div>
      </div>
      ${c.email||c.telefono?`<div class="doc-card-bottom"><span class="doc-card-date">${esc(c.email||c.telefono)}</span></div>`:''}
    </div>`).join('');
  list.querySelectorAll('.doc-card').forEach(card=>card.addEventListener('click',()=>openClientForm(card.dataset.id)));
}

let clientFormId=null;
function openClientForm(id) {
  clientFormId=id||null;
  const c=id?loadClients().find(x=>x.id===id):null;
  document.getElementById('mClientTitle').textContent=id?'Editar cliente':'Nuevo cliente';
  document.getElementById('mc-nombre').value=c?.nombre||'';
  document.getElementById('mc-nif').value=c?.nif||'';
  document.getElementById('mc-email').value=c?.email||'';
  document.getElementById('mc-tel').value=c?.telefono||'';
  document.getElementById('mc-dir').value=c?.direccion||'';
  document.getElementById('mClientDelete').style.display=id?'block':'none';
  showOverlay('mClientForm');
}

function saveClientForm() {
  const nombre=document.getElementById('mc-nombre').value.trim();
  if(!nombre) { showToast('El nombre es obligatorio'); return; }
  const data={nombre,nif:document.getElementById('mc-nif').value.trim(),email:document.getElementById('mc-email').value.trim(),
    telefono:document.getElementById('mc-tel').value.trim(),direccion:document.getElementById('mc-dir').value.trim()};
  const clients=loadClients();
  const now=new Date().toISOString();
  if(clientFormId) {
    const c=clients.find(x=>x.id===clientFormId);
    if(c) Object.assign(c,data,{actualizadoEn:now});
  } else {
    clients.push({id:uid(),...data,creadoEn:now,actualizadoEn:now});
  }
  saveClients(clients);
  hideOverlay('mClientForm'); showToast('Cliente guardado ✓'); renderClients();
}

function deleteClientForm() {
  if(!clientFormId) return;
  saveClients(loadClients().filter(c=>c.id!==clientFormId));
  hideOverlay('mClientForm'); showToast('Cliente eliminado'); renderClients();
}

function renderClientSuggestions(query) {
  const box=document.getElementById('clientSuggest');
  if(!isPro()||query.trim().length<2) { box.classList.add('hidden'); box.innerHTML=''; return; }
  const q=query.trim().toLowerCase();
  const matches=loadClients().filter(c=>c.nombre.toLowerCase().includes(q)).slice(0,5);
  if(!matches.length) { box.classList.add('hidden'); box.innerHTML=''; return; }
  box.innerHTML=matches.map(c=>`<div class="client-suggest-item" data-id="${c.id}"><b>${esc(c.nombre)}</b>${c.nif?` · ${esc(c.nif)}`:''}</div>`).join('');
  box.classList.remove('hidden');
  box.querySelectorAll('[data-id]').forEach(item=>item.addEventListener('mousedown',e=>{
    e.preventDefault();
    const c=loadClients().find(x=>x.id===item.dataset.id);
    if(c) {
      document.getElementById('f-cNombre').value=c.nombre;
      document.getElementById('f-cNif').value=c.nif||'';
      document.getElementById('f-cEmail').value=c.email||'';
      document.getElementById('f-cTel').value=c.telefono||'';
      document.getElementById('f-cDir').value=c.direccion||'';
      formDirty=true;
    }
    box.classList.add('hidden'); box.innerHTML='';
  }));
}

/* ── AGENDA ── */
function startOfWeek(dateStr) {
  const d=new Date(dateStr+'T00:00:00');
  const dow=(d.getDay()+6)%7; // 0=lunes
  d.setDate(d.getDate()-dow);
  return d;
}
function toISO(d) { return d.toISOString().split('T')[0]; }

function renderAgenda() {
  const lock=document.getElementById('agendaLock');
  const strip=document.getElementById('weekStrip');
  const list=document.getElementById('agendaList');
  const fab=document.getElementById('agendaFabBtn');
  if(!isPro()) {
    lock.classList.remove('hidden');
    strip.classList.add('hidden'); list.classList.add('hidden'); fab.classList.add('hidden');
    document.getElementById('agendaEmpty').classList.add('hidden');
    return;
  }
  lock.classList.add('hidden');
  strip.classList.remove('hidden'); list.classList.remove('hidden'); fab.classList.remove('hidden');
  renderWeekStrip();
  renderCitaList();
}

function renderWeekStrip() {
  const strip=document.getElementById('weekStrip');
  const start=startOfWeek(state.agendaDate);
  const citas=loadCitas();
  const DOWS=['L','M','X','J','V','S','D'];
  let html='';
  for(let i=0;i<7;i++) {
    const d=new Date(start); d.setDate(start.getDate()+i);
    const iso=toISO(d);
    const hasCitas=citas.some(c=>c.fecha===iso);
    const active=iso===state.agendaDate;
    html+=`<div class="day-cell${active?' active':''}${hasCitas?' has-citas':''}" data-date="${iso}">
      <span class="dow">${DOWS[i]}</span><span class="dnum">${d.getDate()}</span><span class="dot"></span>
    </div>`;
  }
  strip.innerHTML=html;
  strip.querySelectorAll('.day-cell').forEach(cell=>cell.addEventListener('click',()=>{
    state.agendaDate=cell.dataset.date; renderWeekStrip(); renderCitaList();
  }));
}

function renderCitaList() {
  const list=document.getElementById('agendaList');
  const empty=document.getElementById('agendaEmpty');
  const citas=loadCitas().filter(c=>c.fecha===state.agendaDate).sort((a,b)=>(a.hora||'').localeCompare(b.hora||''));
  if(!citas.length) { list.innerHTML=''; empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');
  list.innerHTML=citas.map(c=>{
    const info=ESTADOS_CITA[c.estado]||ESTADOS_CITA.pendiente;
    const tieneTel=!!c.cliente.telefono;
    return `<div class="cita-card" data-id="${c.id}">
      <div class="cita-time">${c.hora||'--:--'}</div>
      <div class="cita-body">
        <div class="cita-cliente">${esc(c.cliente.nombre||'Sin nombre')}</div>
        ${c.direccion?`<div class="cita-dir">${esc(c.direccion)}</div>`:''}
      </div>
      <span class="cita-status ${info.cls}">${info.label}</span>
      <button class="cita-wa" data-wa-id="${c.id}" aria-label="Enviar recordatorio por WhatsApp" title="Enviar recordatorio por WhatsApp" ${tieneTel?'':'disabled'} type="button">${WA_ICON_SVG}</button>
    </div>`;
  }).join('');
  list.querySelectorAll('.cita-card').forEach(card=>card.addEventListener('click',e=>{
    if(e.target.closest('.cita-wa')) return;
    openCitaForm(card.dataset.id);
  }));
  list.querySelectorAll('.cita-wa').forEach(btn=>btn.addEventListener('click',e=>{
    e.stopPropagation();
    if(!btn.disabled) sendCitaReminder(btn.dataset.waId);
  }));
}

let citaFormId=null;
function openCitaForm(id) {
  citaFormId=id||null;
  const c=id?loadCitas().find(x=>x.id===id):null;
  document.getElementById('mCitaTitle').textContent=id?'Editar cita':'Nueva cita';
  document.getElementById('ct-cliente').value=c?.cliente.nombre||'';
  document.getElementById('ct-tel').value=c?.cliente.telefono||'';
  document.getElementById('ct-fecha').value=c?.fecha||state.agendaDate||today();
  document.getElementById('ct-hora').value=c?.hora||'';
  document.getElementById('ct-dir').value=c?.direccion||'';
  document.getElementById('ct-notas').value=c?.notas||'';
  document.getElementById('mCitaDelete').style.display=id?'block':'none';
  document.getElementById('ctConflictWarn').classList.add('hidden');
  const box=document.getElementById('citaClientSuggest');
  box.classList.add('hidden'); box.innerHTML='';
  showOverlay('mCitaForm');
}

function citaConflict(fecha,hora,excludeId) {
  if(!hora) return false;
  return loadCitas().some(c=>c.id!==excludeId && c.fecha===fecha && c.hora===hora && c.estado!=='cancelada');
}

function checkCitaConflict() {
  const fecha=document.getElementById('ct-fecha').value;
  const hora=document.getElementById('ct-hora').value;
  document.getElementById('ctConflictWarn').classList.toggle('hidden', !citaConflict(fecha,hora,citaFormId));
}

function saveCitaForm() {
  const nombre=document.getElementById('ct-cliente').value.trim();
  const fecha=document.getElementById('ct-fecha').value;
  if(!nombre) { showToast('El nombre del cliente es obligatorio'); return; }
  if(!fecha) { showToast('La fecha es obligatoria'); return; }
  const telefono=document.getElementById('ct-tel').value.trim();
  const data={
    cliente:{nombre,telefono},
    fecha, hora:document.getElementById('ct-hora').value,
    direccion:document.getElementById('ct-dir').value.trim(),
    notas:document.getElementById('ct-notas').value.trim()
  };
  const citas=loadCitas();
  if(citaFormId) {
    const c=citas.find(x=>x.id===citaFormId);
    if(c) Object.assign(c,data);
  } else {
    citas.push({id:uid(),...data,estado:'pendiente',creadoEn:new Date().toISOString()});
  }
  saveCitas(citas);
  if(nombre) upsertClientFromDoc({nombre,telefono,direccion:data.direccion});
  hideOverlay('mCitaForm'); showToast('Cita guardada ✓');
  state.agendaDate=fecha; renderWeekStrip(); renderCitaList();
}

function deleteCitaForm() {
  if(!citaFormId) return;
  saveCitas(loadCitas().filter(c=>c.id!==citaFormId));
  hideOverlay('mCitaForm'); showToast('Cita eliminada'); renderWeekStrip(); renderCitaList();
}

function renderCitaClientSuggestions(query) {
  const box=document.getElementById('citaClientSuggest');
  if(query.trim().length<2) { box.classList.add('hidden'); box.innerHTML=''; return; }
  const q=query.trim().toLowerCase();
  const matches=loadClients().filter(c=>c.nombre.toLowerCase().includes(q)).slice(0,5);
  if(!matches.length) { box.classList.add('hidden'); box.innerHTML=''; return; }
  box.innerHTML=matches.map(c=>`<div class="client-suggest-item" data-id="${c.id}"><b>${esc(c.nombre)}</b>${c.telefono?` · ${esc(c.telefono)}`:''}</div>`).join('');
  box.classList.remove('hidden');
  box.querySelectorAll('[data-id]').forEach(item=>item.addEventListener('mousedown',e=>{
    e.preventDefault();
    const c=loadClients().find(x=>x.id===item.dataset.id);
    if(c) {
      document.getElementById('ct-cliente').value=c.nombre;
      document.getElementById('ct-tel').value=c.telefono||'';
      document.getElementById('ct-dir').value=c.direccion||'';
    }
    box.classList.add('hidden'); box.innerHTML='';
  }));
}

/* ── WHATSAPP ── */
function formatPhoneWa(tel) {
  let digits=(tel||'').replace(/[^\d+]/g,'');
  if(digits.startsWith('+')) return digits.slice(1);
  digits=digits.replace(/^0+/,'');
  if(digits.length===9) return '34'+digits;
  return digits;
}
function buildWaLink(tel,text) {
  return `https://wa.me/${formatPhoneWa(tel)}?text=${encodeURIComponent(text)}`;
}

function sendCitaReminder(id) {
  const c=loadCitas().find(x=>x.id===id);
  if(!c||!c.cliente.telefono) return;
  const p=loadProfile();
  const msg=`Hola ${c.cliente.nombre}, te recuerdo tu cita el ${fmtDate(c.fecha)}${c.hora?` a las ${c.hora}`:''}${c.direccion?` en ${c.direccion}`:''}. Un saludo${p.nombre?`, ${p.nombre}`:''}.`;
  window.open(buildWaLink(c.cliente.telefono,msg),'_blank');
}

async function sendDocViaWhatsapp(doc) {
  const tel=doc.cliente.telefono;
  if(!tel) { showToast('Añade el teléfono del cliente para enviar por WhatsApp'); return; }
  const pdf=buildDocPDF(doc);
  const filename=`${doc.numero}.pdf`;
  const msg=`Hola ${doc.cliente.nombre}, te envío ${doc.tipo==='factura'?'la factura':'el presupuesto'} ${doc.numero} por ${fmt(doc.total)}. Un saludo.`;
  try {
    const blob=pdf.output('blob');
    const file=new File([blob],filename,{type:'application/pdf'});
    if(navigator.canShare && navigator.canShare({files:[file]})) {
      await navigator.share({files:[file],text:msg});
      showToast('Compartido ✓');
      return;
    }
  } catch(err) { if(err?.name==='AbortError') return; }
  pdf.save(filename);
  showToast('PDF descargado — adjúntalo al chat de WhatsApp');
  window.open(buildWaLink(tel,msg),'_blank');
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
  const clientCount=loadClients().length;
  document.getElementById('clientsCard').innerHTML=pro
    ?`<button class="btn-primary w100" type="button" id="goClients">Clientes guardados (${clientCount})</button>`
    :`<button class="outline w100" type="button" id="goClients">🔒 Clientes guardados — función Pro</button>`;
  document.getElementById('goClients').addEventListener('click',()=>isPro()?navigate('clients'):showOverlay('mUpgrade'));
}

function generatePDF(doc) {
  const pdf=buildDocPDF(doc);
  pdf.save(`${doc.numero}.pdf`); showToast('PDF generado ✓');
}

function buildDocPDF(doc) {
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
  const hasIrpf=doc.irpf>0;
  const boxH=hasIrpf?40:32; const totalLineY=hasIrpf?35:27;
  if(y+boxH+10>270){pdf.addPage();y=20;}
  const boxX=130; pdf.setDrawColor(229,231,235); pdf.setFillColor(255,255,255);
  pdf.roundedRect(boxX,y,W-mR-boxX,boxH,2,2,'FD');
  pdf.setFont('helvetica','normal'); pdf.setFontSize(9); pdf.setTextColor(107,114,128);
  pdf.text('Subtotal',boxX+4,y+8); pdf.text(`IVA (${doc.iva}%)`,boxX+4,y+16);
  if(hasIrpf) pdf.text(`Retención IRPF (-${doc.irpf}%)`,boxX+4,y+24);
  pdf.setFont('helvetica','bold'); pdf.setFontSize(10); pdf.setTextColor(17,24,39);
  pdf.text('TOTAL',boxX+4,y+totalLineY);
  pdf.setFont('helvetica','normal'); pdf.setFontSize(9); pdf.setTextColor(107,114,128);
  pdf.text(fmt(doc.subtotal),col2,y+8,{align:'right'}); pdf.text(fmt(doc.ivaAmt),col2,y+16,{align:'right'});
  if(hasIrpf) pdf.text(`-${fmt(doc.irpfAmt)}`,col2,y+24,{align:'right'});
  pdf.setFont('helvetica','bold'); pdf.setFontSize(11); pdf.setTextColor(79,70,229);
  pdf.text(fmt(doc.total),col2,y+totalLineY,{align:'right'}); y+=boxH+6;
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
  return pdf;
}

function submitForm(e) {
  e.preventDefault();
  const nombre=document.getElementById('f-cNombre').value.trim();
  if(!nombre){showToast('El nombre del cliente es obligatorio');return;}
  const validLines=lines.filter(l=>l.desc.trim());
  if(!validLines.length){showToast('Añade al menos un concepto');return;}
  const isEdit=!!state.editId;
  if(!isEdit&&!canCreate()){showOverlay('mUpgrade');return;}
  const {subtotal,ivaAmt,irpfAmt,total}=calcTotals();
  const docs=loadDocs();
  if(isEdit) {
    const doc=docs.find(d=>d.id===state.editId);
    if(doc){
      doc.cliente={nombre,nif:document.getElementById('f-cNif').value.trim(),email:document.getElementById('f-cEmail').value.trim(),telefono:document.getElementById('f-cTel').value.trim(),direccion:document.getElementById('f-cDir').value.trim()};
      doc.lineas=validLines; doc.iva=state.iva; doc.irpf=state.irpf; doc.subtotal=subtotal; doc.ivaAmt=ivaAmt; doc.irpfAmt=irpfAmt; doc.total=total;
      doc.fecha=document.getElementById('f-fecha').value; doc.vencimiento=document.getElementById('f-vence').value;
      doc.notas=document.getElementById('f-notas').value.trim();
      upsertClientFromDoc(doc.cliente);
    }
    formDirty=false; saveDocs(docs); showToast('Cambios guardados ✓'); navigate('detail',{id:state.editId});
  } else {
    useSlot();
    const tipo=state.tab.slice(0,-1);
    const doc={id:uid(),tipo,numero:nextNum(tipo),estado:'borrador',
      cliente:{nombre,nif:document.getElementById('f-cNif').value.trim(),email:document.getElementById('f-cEmail').value.trim(),telefono:document.getElementById('f-cTel').value.trim(),direccion:document.getElementById('f-cDir').value.trim()},
      lineas:validLines,iva:state.iva,irpf:state.irpf,subtotal,ivaAmt,irpfAmt,total,
      fecha:document.getElementById('f-fecha').value,vencimiento:document.getElementById('f-vence').value,
      notas:document.getElementById('f-notas').value.trim(),creadoEn:new Date().toISOString()};
    upsertClientFromDoc(doc.cliente);
    formDirty=false; docs.push(doc); saveDocs(docs); showToast(tipo==='factura'?'Factura creada ✓':'Presupuesto creado ✓'); navigate('detail',{id:doc.id});
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
    if(active?.id==='vForm') confirmLeaveForm(()=>state.editId?navigate('detail',{id:state.editId}):navigate('home'));
    else if(active?.id==='vDetail') navigate('home');
    else navigate('home');
  });
  document.getElementById('hdrSettingsBtn').addEventListener('click',()=>navigate('settings'));
  document.querySelectorAll('.nav-btn').forEach(btn=>btn.addEventListener('click',()=>{
    const nav=btn.dataset.nav;
    const doNav=()=>{
      if(nav==='home') navigate('home');
      else if(nav==='new'){if(!canCreate()){showOverlay('mUpgrade');return;}navigate('form');}
      else if(nav==='agenda') navigate('agenda');
      else if(nav==='settings') navigate('settings');
    };
    const active=document.querySelector('.view.active');
    if(active?.id==='vForm') confirmLeaveForm(doNav); else doNav();
  }));
  document.getElementById('fabBtn').addEventListener('click',()=>{ if(!canCreate()){showOverlay('mUpgrade');return;} navigate('form'); });
  document.querySelectorAll('.tab').forEach(tab=>tab.addEventListener('click',()=>{ state.tab=tab.dataset.t; renderDocList(); }));
  document.getElementById('addLineBtn').addEventListener('click',()=>{ lines.push(newLine()); formDirty=true; renderLines(); });
  document.querySelectorAll('.iva-btn:not(.irpf-btn)').forEach(btn=>btn.addEventListener('click',()=>{
    state.iva=Number(btn.dataset.v); formDirty=true;
    document.querySelectorAll('.iva-btn:not(.irpf-btn)').forEach(b=>b.classList.toggle('active',Number(b.dataset.v)===state.iva));
    updateTotals();
  }));
  document.querySelectorAll('.irpf-btn').forEach(btn=>btn.addEventListener('click',()=>{
    state.irpf=Number(btn.dataset.v); formDirty=true;
    document.querySelectorAll('.irpf-btn').forEach(b=>b.classList.toggle('active',Number(b.dataset.v)===state.irpf));
    updateTotals();
  }));
  document.getElementById('docForm').addEventListener('input',()=>{formDirty=true;});
  document.getElementById('docForm').addEventListener('submit',submitForm);
  document.getElementById('f-cNombre').addEventListener('input',e=>renderClientSuggestions(e.target.value));
  document.getElementById('f-cNombre').addEventListener('focus',e=>renderClientSuggestions(e.target.value));
  document.getElementById('f-cNombre').addEventListener('blur',()=>setTimeout(()=>{
    const box=document.getElementById('clientSuggest'); box.classList.add('hidden'); box.innerHTML='';
  },150));
  document.getElementById('clientsFabBtn').addEventListener('click',()=>openClientForm(null));
  document.getElementById('mClientCancel').addEventListener('click',()=>hideOverlay('mClientForm'));
  document.getElementById('mClientSave').addEventListener('click',saveClientForm);
  document.getElementById('mClientDelete').addEventListener('click',deleteClientForm);
  document.getElementById('agendaFabBtn').addEventListener('click',()=>{ if(!isPro()){showOverlay('mUpgrade');return;} openCitaForm(null); });
  document.getElementById('agendaUnlockBtn').addEventListener('click',()=>showOverlay('mUpgrade'));
  document.getElementById('mCitaCancel').addEventListener('click',()=>hideOverlay('mCitaForm'));
  document.getElementById('mCitaSave').addEventListener('click',saveCitaForm);
  document.getElementById('mCitaDelete').addEventListener('click',deleteCitaForm);
  document.getElementById('ct-cliente').addEventListener('input',e=>renderCitaClientSuggestions(e.target.value));
  document.getElementById('ct-cliente').addEventListener('focus',e=>renderCitaClientSuggestions(e.target.value));
  document.getElementById('ct-cliente').addEventListener('blur',()=>setTimeout(()=>{
    const box=document.getElementById('citaClientSuggest'); box.classList.add('hidden'); box.innerHTML='';
  },150));
  document.getElementById('ct-fecha').addEventListener('input',checkCitaConflict);
  document.getElementById('ct-hora').addEventListener('input',checkCitaConflict);
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