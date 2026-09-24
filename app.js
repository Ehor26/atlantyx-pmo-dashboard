(() => {
  const cfg = window.ATLANTYX_CONFIG;
  const state = { projects: [], updates: [], selectedProjectId: null, selectedWeekKey: null, demo: false };

  const el = id => document.getElementById(id);
  const els = {
    project: el('projectSelect'), week: el('weekSelect'), updated: el('updatedDate'), weekHeadline: el('weekHeadline'),
    status: el('dataStatus'), toast: el('toast'), done: el('doneList'), deliveries: el('deliveryList'),
    schedule: el('scheduleList'), attention: el('attentionList'),
    countDone: el('countDone'), countDeliveries: el('countDeliveries'), countSchedule: el('countSchedule'), countAttention: el('countAttention')
  };

  const demoProjects = [
    { id: 'PRJ001', name: 'Projeto Exemplo A', active: true, order: 1 },
    { id: 'PRJ002', name: 'Projeto Exemplo B', active: true, order: 2 }
  ];
  const demoUpdates = [
    { project:'Projeto Exemplo A', projectId:'PRJ001', date:'2026-09-24', pillar:'O que foi feito', description:'Integração concluída e fluxo principal homologado.', status:'Concluído', start:'', end:'', percent:'', note:'' },
    { project:'Projeto Exemplo A', projectId:'PRJ001', date:'2026-09-24', pillar:'O que foi feito', description:'Cenários críticos de teste executados sem bloqueios.', status:'Concluído', start:'', end:'', percent:'', note:'' },
    { project:'Projeto Exemplo A', projectId:'PRJ001', date:'2026-09-24', pillar:'Entregas', description:'Dashboard executivo disponibilizado para aceite.', status:'Concluído', start:'', end:'2026-09-23', percent:'', note:'Aceite pendente.' },
    { project:'Projeto Exemplo A', projectId:'PRJ001', date:'2026-09-24', pillar:'Entregas', description:'Documentação operacional revisada.', status:'Em curso', start:'', end:'2026-09-25', percent:'', note:'' },
    { project:'Projeto Exemplo A', projectId:'PRJ001', date:'2026-09-24', pillar:'Macros do cronograma', description:'Desenvolvimento', status:'Em curso', start:'2026-09-01', end:'2026-09-30', percent:'75%', note:'' },
    { project:'Projeto Exemplo A', projectId:'PRJ001', date:'2026-09-24', pillar:'Macros do cronograma', description:'Homologação', status:'A iniciar', start:'2026-10-01', end:'2026-10-09', percent:'10%', note:'' },
    { project:'Projeto Exemplo A', projectId:'PRJ001', date:'2026-09-24', pillar:'Pontos de atenção', description:'Liberação do ambiente depende de terceiro e pode impactar a homologação.', status:'Dependência', start:'', end:'2026-09-26', percent:'', note:'Escalonar se não houver liberação.' },
    { project:'Projeto Exemplo A', projectId:'PRJ001', date:'2026-09-17', pillar:'O que foi feito', description:'Arquitetura técnica aprovada.', status:'Concluído', start:'', end:'', percent:'', note:'' },
    { project:'Projeto Exemplo B', projectId:'PRJ002', date:'2026-09-24', pillar:'O que foi feito', description:'Backlog priorizado para a próxima etapa.', status:'Concluído', start:'', end:'', percent:'', note:'' },
    { project:'Projeto Exemplo B', projectId:'PRJ002', date:'2026-09-24', pillar:'Pontos de atenção', description:'Decisão sobre escopo adicional necessária antes do próximo marco.', status:'Decisão', start:'', end:'2026-09-25', percent:'', note:'' }
  ];

  function showToast(msg) {
    els.toast.textContent = msg; els.toast.classList.add('show');
    clearTimeout(showToast.t); showToast.t = setTimeout(() => els.toast.classList.remove('show'), 4200);
  }

  function publishedCsvUrl(gid) {
    if (!cfg.publishedId) throw new Error('publishedId não configurado');
    return `https://docs.google.com/spreadsheets/d/e/${cfg.publishedId}/pub?gid=${gid}&single=true&output=csv&_=${Date.now()}`;
  }

  function parseCsv(text) {
    const rows = [];
    let row = [], field = '', quoted = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (quoted) {
        if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
        else if (ch === '"') quoted = false;
        else field += ch;
      } else {
        if (ch === '"') quoted = true;
        else if (ch === ',') { row.push(field); field = ''; }
        else if (ch === '\n') { row.push(field.replace(/\r$/, '')); rows.push(row); row = []; field = ''; }
        else field += ch;
      }
    }
    if (field.length || row.length) { row.push(field.replace(/\r$/, '')); rows.push(row); }
    return rows.filter(r => r.some(v => String(v).trim() !== ''));
  }

  async function fetchPublishedCsv(gid) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(publishedCsvUrl(gid), { cache: 'no-store', signal: controller.signal });
      if (!response.ok) throw new Error(`Google Sheets respondeu ${response.status}`);
      return parseCsv(await response.text());
    } finally {
      clearTimeout(timer);
    }
  }

  function csvRowsToObjects(rows) {
    if (!rows.length) return [];
    const headers = rows[0].map((h, i) => String(h || `col${i}`).trim());
    return rows.slice(1).map(values => {
      const obj = {};
      headers.forEach((h, i) => obj[h] = values[i] ?? '');
      return obj;
    });
  }

  function normalizeHeader(obj, candidates) {
    const keys = Object.keys(obj);
    const key = keys.find(k => candidates.some(c => normalize(k) === normalize(c)));
    return key ? obj[key] : '';
  }

  function normalize(s) { return String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase(); }

  function parseGvizDate(value) {
    if (!value) return '';
    if (value instanceof Date) return isoDate(value);
    const s = String(value).trim();
    const m = s.match(/^Date\((\d+),(\d+),(\d+)\)$/);
    if (m) return isoDate(new Date(+m[1], +m[2], +m[3]));
    const br = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (br) return `${br[3]}-${String(br[2]).padStart(2,'0')}-${String(br[1]).padStart(2,'0')}`;
    const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return iso ? `${iso[1]}-${iso[2]}-${iso[3]}` : s;
  }

  function parsePercent(v) {
    if (v === '' || v == null) return null;
    if (typeof v === 'number') return Math.max(0, Math.min(100, v <= 1 ? v * 100 : v));
    const n = Number(String(v).replace('%','').replace(',','.'));
    return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : null;
  }

  function isoDate(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
  function localDate(iso) { if (!iso) return null; const [y,m,d] = iso.split('-').map(Number); return new Date(y,m-1,d); }
  function formatDate(iso) { const d=localDate(iso); return d ? new Intl.DateTimeFormat('pt-BR').format(d) : '—'; }
  function shortDate(iso) { const d=localDate(iso); return d ? new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'2-digit'}).format(d) : '—'; }

  function weekInfo(iso) {
    const d = localDate(iso); if (!d) return null;
    const day = d.getDay(); const delta = day === 0 ? -6 : 1-day;
    const monday = new Date(d); monday.setDate(d.getDate()+delta);
    const friday = new Date(monday); friday.setDate(monday.getDate()+4);
    const thursday = new Date(monday); thursday.setDate(monday.getDate()+3);
    const firstThursday = new Date(thursday.getFullYear(),0,4);
    const fd = firstThursday.getDay() || 7; firstThursday.setDate(firstThursday.getDate() + (4-fd));
    const week = 1 + Math.round((thursday-firstThursday)/604800000);
    const monthFmt = new Intl.DateTimeFormat('pt-BR',{month:'short'});
    const sameMonth = monday.getMonth()===friday.getMonth() && monday.getFullYear()===friday.getFullYear();
    const cleanMonth = dt => monthFmt.format(dt).replace('.','');
    const label = sameMonth
      ? `Semana ${week} · ${String(monday.getDate()).padStart(2,'0')}–${String(friday.getDate()).padStart(2,'0')} ${cleanMonth(friday)} ${friday.getFullYear()}`
      : `Semana ${week} · ${String(monday.getDate()).padStart(2,'0')} ${cleanMonth(monday)}–${String(friday.getDate()).padStart(2,'0')} ${cleanMonth(friday)} ${friday.getFullYear()}`;
    return { key: isoDate(monday), monday: isoDate(monday), friday: isoDate(friday), week, label };
  }

  function slugStatus(status) {
    const n = normalize(status).replace(/\s+/g,'-');
    return `status-${n}`;
  }
  function escapeHtml(s) { return String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

  async function loadData() {
    els.status.textContent = 'Atualizando dados do Google Sheets…';
    const forceDemo = new URLSearchParams(location.search).get('demo') === '1';
    try {
      if (forceDemo) throw new Error('Modo demonstração solicitado');
      const [projectRows, updateRows] = await Promise.all([fetchPublishedCsv(cfg.projectsGid), fetchPublishedCsv(cfg.updatesGid)]);
      const rawProjects = csvRowsToObjects(projectRows);
      const rawUpdates = csvRowsToObjects(updateRows);

      state.projects = rawProjects.map(r => ({
        id: String(normalizeHeader(r,['projeto_id','Projeto ID']) || '').trim(),
        name: String(normalizeHeader(r,['projeto','Projeto']) || '').trim(),
        active: !['false','falso','0','nao','não'].includes(normalize(normalizeHeader(r,['ativo','Ativo']))),
        order: Number(normalizeHeader(r,['ordem','Ordem'])) || 999
      })).filter(p => p.id && p.name).sort((a,b)=>a.order-b.order || a.name.localeCompare(b.name));

      state.updates = rawUpdates.map(r => ({
        project: String(normalizeHeader(r,['Projeto']) || '').trim(),
        projectId: String(normalizeHeader(r,['Projeto ID','projeto_id']) || '').trim(),
        date: parseGvizDate(normalizeHeader(r,['Data da atualização','data_atualizacao'])),
        pillar: String(normalizeHeader(r,['Pilar','secao']) || '').trim(),
        description: String(normalizeHeader(r,['Descritivo','descricao','titulo']) || '').trim(),
        status: String(normalizeHeader(r,['Status']) || '').trim(),
        start: parseGvizDate(normalizeHeader(r,['Data início','data_inicio'])),
        end: parseGvizDate(normalizeHeader(r,['Data fim','data_fim'])),
        percent: normalizeHeader(r,['%','percentual']),
        note: String(normalizeHeader(r,['Observação / Evidência','evidencia_observacao']) || '').trim()
      })).filter(x => x.projectId && x.date && x.pillar && x.description);

      if (!state.projects.length) throw new Error('Nenhum projeto encontrado na aba PROJETOS');
      state.demo = false;
      els.status.textContent = 'Fonte: Google Sheets publicado · atualização automática';
    } catch (err) {
      state.projects = demoProjects; state.updates = demoUpdates; state.demo = true;
      els.status.textContent = 'Modo demonstração · não foi possível ler a publicação do Google Sheets';
      showToast('Não foi possível ler a publicação do Google Sheets. Confira se “Publicar na Web” continua ativo e tente Atualizar dados.');
      console.warn(err);
    }
    hydrateSelections(); render();
  }

  function hydrateSelections() {
    const active = state.projects.filter(p => p.active !== false);
    const previous = state.selectedProjectId;
    els.project.innerHTML = active.map(p => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)}</option>`).join('');
    state.selectedProjectId = active.some(p=>p.id===previous) ? previous : (active[0]?.id || null);
    els.project.value = state.selectedProjectId || '';
    updateWeekOptions();
  }

  function weeksForProject(projectId) {
    const map = new Map();
    state.updates.filter(u=>u.projectId===projectId).forEach(u => { const w=weekInfo(u.date); if (w) map.set(w.key,w); });
    return [...map.values()].sort((a,b)=>b.key.localeCompare(a.key));
  }

  function updateWeekOptions() {
    const weeks = weeksForProject(state.selectedProjectId);
    const previous = state.selectedWeekKey;
    els.week.innerHTML = weeks.map(w=>`<option value="${w.key}">${w.label}</option>`).join('');
    state.selectedWeekKey = weeks.some(w=>w.key===previous) ? previous : (weeks[0]?.key || null);
    els.week.value = state.selectedWeekKey || '';
  }

  function selectedRows() {
    return state.updates.filter(u => u.projectId===state.selectedProjectId && weekInfo(u.date)?.key===state.selectedWeekKey);
  }

  function render() {
    const rows = selectedRows();
    const week = weeksForProject(state.selectedProjectId).find(w=>w.key===state.selectedWeekKey);
    const latestDate = rows.map(r=>r.date).sort().at(-1) || '';
    els.updated.textContent = latestDate ? formatDate(latestDate) : '—';
    els.weekHeadline.textContent = week?.label || 'Sem atualização para este projeto';

    const done = rows.filter(r=>normalize(r.pillar)==='o que foi feito');
    const deliveries = rows.filter(r=>normalize(r.pillar)==='entregas');
    const schedule = rows.filter(r=>normalize(r.pillar)==='macros do cronograma');
    const attention = rows.filter(r=>normalize(r.pillar)==='pontos de atencao');
    els.countDone.textContent=done.length; els.countDeliveries.textContent=deliveries.length; els.countSchedule.textContent=schedule.length; els.countAttention.textContent=attention.length;

    els.done.innerHTML = done.length ? done.map((r,i)=>`
      <div class="done-item">
        <div class="item-number">${String(i+1).padStart(2,'0')}</div>
        <div><div class="item-title">${escapeHtml(r.description)}</div>${r.note?`<div class="item-description">${escapeHtml(r.note)}</div>`:''}</div>
        ${r.status?`<span class="status-badge ${slugStatus(r.status)}">${escapeHtml(r.status)}</span>`:''}
      </div>`).join('') : empty('Nenhuma execução registrada nesta semana.');

    els.deliveries.innerHTML = deliveries.length ? deliveries.map(r=>`
      <div class="delivery-row">
        <div><div class="item-title">${escapeHtml(r.description)}</div>${r.note?`<div class="item-description">${escapeHtml(r.note)}</div>`:''}</div>
        ${r.status?`<span class="status-badge ${slugStatus(r.status)}">${escapeHtml(r.status)}</span>`:'<span></span>'}
        <div class="delivery-date">${r.end?shortDate(r.end):'—'}</div>
      </div>`).join('') : empty('Nenhuma entrega registrada nesta semana.');

    els.schedule.innerHTML = schedule.length ? schedule.map(r=>{
      const pct=parsePercent(r.percent); return `
      <div class="schedule-item">
        <div class="schedule-head"><div class="item-title">${escapeHtml(r.description)}</div><div class="schedule-percent">${pct==null?'—':Math.round(pct)+'%'}</div></div>
        <div class="schedule-dates">${r.start?shortDate(r.start):'—'} → ${r.end?shortDate(r.end):'—'} ${r.status?` · ${escapeHtml(r.status)}`:''}</div>
        <div class="progress-track"><div class="progress-fill" style="width:${pct ?? 0}%"></div></div>
        ${r.note?`<div class="item-description">${escapeHtml(r.note)}</div>`:''}
      </div>`}).join('') : empty('Nenhuma macro de cronograma registrada nesta semana.');

    els.attention.innerHTML = attention.length ? attention.map(r=>`
      <div class="attention-item">
        <div class="attention-type">${escapeHtml(r.status || 'Atenção')}</div>
        <div><div class="item-title">${escapeHtml(r.description)}</div>${r.note?`<div class="item-description">${escapeHtml(r.note)}</div>`:''}</div>
        <div class="attention-date">${r.end?shortDate(r.end):'—'}</div>
      </div>`).join('') : empty('Nenhum ponto de atenção registrado nesta semana.');

    const total = rows.length;
    document.body.classList.toggle('compact', total > 12 || Math.max(done.length,deliveries.length,schedule.length,attention.length) > 5);
  }

  function empty(text) { return `<div class="empty-state">${escapeHtml(text)}</div>`; }
  function cycle(select, delta, onChange) {
    const n=select.options.length; if(!n) return;
    select.selectedIndex=(select.selectedIndex+delta+n)%n; onChange();
  }

  els.project.addEventListener('change',()=>{ state.selectedProjectId=els.project.value; state.selectedWeekKey=null; updateWeekOptions(); render(); });
  els.week.addEventListener('change',()=>{ state.selectedWeekKey=els.week.value; render(); });
  el('prevProject').addEventListener('click',()=>cycle(els.project,-1,()=>els.project.dispatchEvent(new Event('change'))));
  el('nextProject').addEventListener('click',()=>cycle(els.project,1,()=>els.project.dispatchEvent(new Event('change'))));
  el('prevWeek').addEventListener('click',()=>cycle(els.week,1,()=>els.week.dispatchEvent(new Event('change'))));
  el('nextWeek').addEventListener('click',()=>cycle(els.week,-1,()=>els.week.dispatchEvent(new Event('change'))));
  el('refreshButton').addEventListener('click',loadData);

  loadData();
  if (cfg.refreshMinutes > 0) setInterval(loadData, cfg.refreshMinutes * 60 * 1000);
})();
