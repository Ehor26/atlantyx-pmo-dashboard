(() => {
  const cfg = window.ATLANTYX_CONFIG;
  const state = { projects: [], updates: [], teams: [], indicators: [], selectedClient: null, selectedProjectId: null, selectedWeekKey: null, demo: false };

  const el = id => document.getElementById(id);
  const els = {
    client: el('clientSelect'), project: el('projectSelect'), week: el('weekSelect'), updated: el('updatedDate'), pageTitle: el('pageTitle'),
    status: el('dataStatus'), toast: el('toast'), done: el('doneList'), planned: el('plannedList'),
    schedule: el('scheduleList'), attention: el('attentionList'),
    countDone: el('countDone'), countPlanned: el('countPlanned'), countSchedule: el('countSchedule'), countAttention: el('countAttention'),
    signal: el('projectSignal'), signalDot: el('projectSignalDot'), signalText: el('projectSignalText'),
    teamButton: el('teamButton'), teamModal: el('teamModal'), teamModalClose: el('teamModalClose'), teamProjectName: el('teamProjectName'), teamList: el('teamList'),
    indicatorDate: el('indicatorDate'), indicatorActual: el('indicatorActual'), indicatorPlanned: el('indicatorPlanned'), indicatorActualBar: el('indicatorActualBar'), indicatorPlannedBar: el('indicatorPlannedBar')
  };

  const demoProjects = [
    { id: 'PRJ001', name: 'Projeto Exemplo A', active: true, order: 1, signal: 'Sem atraso', client: 'Cliente A' },
    { id: 'PRJ002', name: 'Projeto Exemplo B', active: true, order: 2, signal: 'Atraso sem impacto no término', client: 'Cliente B' }
  ];
  const demoTeams = [
    { id:'1', name:'Ana Souza', role:'PM', project:'Projeto Exemplo A', projectId:'PRJ001' },
    { id:'2', name:'Bruno Lima', role:'Arquiteto', project:'Projeto Exemplo A', projectId:'PRJ001' }
  ];
  const demoIndicators = [
    { project:'Projeto Exemplo A', projectId:'PRJ001', date:'2026-09-24', actual:75, planned:82, signal:'Sem atraso' },
    { project:'Projeto Exemplo B', projectId:'PRJ002', date:'2026-09-24', actual:48, planned:55, signal:'Atraso sem impacto no término' }
  ];
  const demoUpdates = [
    { project:'Projeto Exemplo A', projectId:'PRJ001', date:'2026-09-24', pillar:'O que foi feito', description:'Integração concluída e fluxo principal homologado.', status:'Concluído', start:'', end:'', percent:'', note:'' },
    { project:'Projeto Exemplo A', projectId:'PRJ001', date:'2026-09-24', pillar:'O que foi feito', description:'Cenários críticos de teste executados sem bloqueios.', status:'Concluído', start:'', end:'', percent:'', note:'' },
    { project:'Projeto Exemplo A', projectId:'PRJ001', date:'2026-09-24', pillar:'O que será feito', description:'Dashboard executivo disponibilizado para aceite.', status:'Concluído', start:'', end:'2026-09-23', percent:'', note:'Aceite pendente.' },
    { project:'Projeto Exemplo A', projectId:'PRJ001', date:'2026-09-24', pillar:'O que será feito', description:'Documentação operacional revisada.', status:'Em curso', start:'', end:'2026-09-25', percent:'', note:'' },
    { project:'Projeto Exemplo A', projectId:'PRJ001', date:'2026-09-24', pillar:'Marcos do cronograma', description:'Desenvolvimento', status:'Em curso', start:'2026-09-01', end:'2026-09-30', percent:'75%', note:'' },
    { project:'Projeto Exemplo A', projectId:'PRJ001', date:'2026-09-24', pillar:'Marcos do cronograma', description:'Homologação', status:'A iniciar', start:'2026-10-01', end:'2026-10-09', percent:'10%', note:'' },
    { project:'Projeto Exemplo A', projectId:'PRJ001', date:'2026-09-24', pillar:'Pontos de atenção', description:'Liberação do ambiente depende de terceiro e pode impactar a homologação.', status:'Dependência', start:'', end:'2026-09-26', percent:'', note:'', action:'Escalonar com Segurança de Dados se o ambiente não for liberado até o próximo checkpoint.' },
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
      const [projectRows, updateRows, teamRows, indicatorRows] = await Promise.all([
        fetchPublishedCsv(cfg.projectsGid),
        fetchPublishedCsv(cfg.updatesGid),
        fetchPublishedCsv(cfg.teamGid),
        fetchPublishedCsv(cfg.indicatorsGid)
      ]);
      const rawProjects = csvRowsToObjects(projectRows);
      const rawUpdates = csvRowsToObjects(updateRows);
      const rawTeams = csvRowsToObjects(teamRows);
      const rawIndicators = csvRowsToObjects(indicatorRows);

      state.projects = rawProjects.map(r => ({
        id: String(normalizeHeader(r,['projeto_id','Projeto ID']) || '').trim(),
        name: String(normalizeHeader(r,['projeto','Projeto']) || '').trim(),
        active: !['false','falso','0','nao','não'].includes(normalize(normalizeHeader(r,['ativo','Ativo']))),
        order: Number(normalizeHeader(r,['ordem','Ordem'])) || 999,
        signal: String(normalizeHeader(r,['sinalizador','Sinalizador','status_projeto','Status do projeto']) || '').trim(),
        client: String(normalizeHeader(r,['Cliente','cliente']) || '').trim()
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
        note: String(normalizeHeader(r,['Observação / Evidência','evidencia_observacao']) || '').trim(),
        action: String(normalizeHeader(r,['Ação','Acao','acao','AÇÕES','Acoes','acoes']) || '').trim()
      })).filter(x => x.projectId && x.date && x.pillar && x.description);

      state.teams = rawTeams.map(r => ({
        id: String(normalizeHeader(r,['Id_recurso','id_recurso','ID recurso']) || '').trim(),
        name: String(normalizeHeader(r,['recurso','Recurso','nome','Nome']) || '').trim(),
        role: String(normalizeHeader(r,['funcao','função','Funcao','Função','papel','Papel']) || '').trim(),
        project: String(normalizeHeader(r,['projeto','Projeto']) || '').trim(),
        projectId: String(normalizeHeader(r,['projeto_id','Projeto ID','projeto id']) || '').trim()
      })).filter(x => x.name && (x.projectId || x.project));

      state.indicators = rawIndicators.map(r => ({
        project: String(normalizeHeader(r,['Projeto','projeto']) || '').trim(),
        projectId: String(normalizeHeader(r,['Projeto ID','projeto_id']) || '').trim(),
        date: parseGvizDate(normalizeHeader(r,['Data referência','Data referencia','data_referencia','Data'])),
        actual: parsePercent(normalizeHeader(r,['% concluído','% concluido','percentual_concluido','Concluído','Concluido'])),
        planned: parsePercent(normalizeHeader(r,['% planejado','percentual_planejado','Planejado'])),
        signal: String(normalizeHeader(r,['sinalizador','Sinalizador','status_projeto','Status do projeto']) || '').trim()
      })).filter(x => x.projectId && x.date);

      if (!state.projects.length) throw new Error('Nenhum projeto encontrado na aba PROJETOS');
      state.demo = false;
      els.status.textContent = 'Fonte: Google Sheets publicado · atualização automática';
    } catch (err) {
      state.projects = demoProjects; state.updates = demoUpdates; state.teams = demoTeams; state.indicators = demoIndicators; state.demo = true;
      els.status.textContent = 'Modo demonstração · não foi possível ler a publicação do Google Sheets';
      showToast('Não foi possível ler a publicação do Google Sheets. Confira se “Publicar na Web” continua ativo e tente Atualizar dados.');
      console.warn(err);
    }
    hydrateSelections(); render();
  }

  function activeProjects() {
    return state.projects.filter(p => p.active !== false);
  }

  function clientOptions() {
    return [...new Set(activeProjects().map(p => p.client).filter(Boolean))]
      .sort((a,b) => a.localeCompare(b, 'pt-BR'));
  }

  function projectsForClient(client) {
    const active = activeProjects();
    if (!client || client === '__ALL__') return active;
    return active.filter(p => normalize(p.client) === normalize(client));
  }

  function fillClientOptions() {
    const clients = clientOptions();
    els.client.innerHTML = [
      '<option value="__ALL__">Todos</option>',
      ...clients.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`)
    ].join('');
  }

  function updateProjectOptions({ resetWeek = false } = {}) {
    const visible = projectsForClient(state.selectedClient);
    const previousProject = state.selectedProjectId;
    els.project.innerHTML = visible.map(p => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)}</option>`).join('');
    state.selectedProjectId = visible.some(p => p.id === previousProject) ? previousProject : (visible[0]?.id || null);
    els.project.value = state.selectedProjectId || '';
    if (resetWeek) state.selectedWeekKey = null;
    updateWeekOptions();
  }

  function hydrateSelections() {
    const active = activeProjects();
    const previousProject = state.selectedProjectId;
    const previousClient = state.selectedClient;
    fillClientOptions();
    state.selectedProjectId = active.some(p=>p.id===previousProject) ? previousProject : (active[0]?.id || null);
    const selectedProject = active.find(p => p.id === state.selectedProjectId) || null;
    const clients = clientOptions();
    if (previousClient === '__ALL__' || clients.some(c => c === previousClient)) state.selectedClient = previousClient;
    else state.selectedClient = selectedProject?.client || '__ALL__';
    if (!state.selectedClient) state.selectedClient = selectedProject?.client || '__ALL__';
    if (!previousClient && selectedProject?.client) state.selectedClient = selectedProject.client;
    els.client.value = state.selectedClient;
    updateProjectOptions();
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

  function renderActionTooltip(action) {
    if (!action) return '<span class="action-empty" aria-label="Ação não informada">—</span>';
    const safe = escapeHtml(action);
    return `<span class="action-info" tabindex="0" aria-label="Ação: ${safe}">
      <span class="action-info__icon" aria-hidden="true">ⓘ</span>
      <span class="action-tooltip" role="tooltip">${safe}</span>
    </span>`;
  }

  function render() {
    const rows = selectedRows();
    const week = weeksForProject(state.selectedProjectId).find(w=>w.key===state.selectedWeekKey);
    const latestDate = rows.map(r=>r.date).sort().at(-1) || '';
    els.updated.textContent = latestDate ? formatDate(latestDate) : '—';

    const done = rows.filter(r=>normalize(r.pillar)==='o que foi feito');
    const planned = rows.filter(r=>['o que sera feito','entregas'].includes(normalize(r.pillar)));
    const schedule = rows.filter(r=>['marcos do cronograma','macros do cronograma'].includes(normalize(r.pillar)));
    const attention = rows.filter(r=>normalize(r.pillar)==='pontos de atencao');
    els.countDone.textContent=done.length; els.countPlanned.textContent=planned.length; els.countSchedule.textContent=schedule.length; els.countAttention.textContent=attention.length;
    renderProjectMeta();
    renderIndicatorSummary(week);

    els.done.innerHTML = done.length ? done.map((r,i)=>`
      <div class="done-item">
        <div class="item-number">${String(i+1).padStart(2,'0')}</div>
        <div><div class="item-title">${escapeHtml(r.description)}</div>${r.note?`<div class="item-description">${escapeHtml(r.note)}</div>`:''}</div>
        ${r.status?`<span class="status-badge ${slugStatus(r.status)}">${escapeHtml(r.status)}</span>`:''}
      </div>`).join('') : empty('Nenhuma execução registrada nesta semana.');

    els.planned.innerHTML = planned.length ? planned.map(r=>`
      <div class="delivery-row">
        <div><div class="item-title">${escapeHtml(r.description)}</div>${r.note?`<div class="item-description">${escapeHtml(r.note)}</div>`:''}</div>
        ${r.status?`<span class="status-badge ${slugStatus(r.status)}">${escapeHtml(r.status)}</span>`:'<span></span>'}
        <div class="delivery-date">${r.end?shortDate(r.end):'—'}</div>
      </div>`).join('') : empty('Nenhum próximo passo registrado nesta semana.');

    els.schedule.innerHTML = schedule.length ? schedule.map(r=>{
      const pct=parsePercent(r.percent); return `
      <div class="schedule-item">
        <div class="schedule-head">
          <div class="item-title">${escapeHtml(r.description)}</div>
          <div class="schedule-end-date">${r.end?shortDate(r.end):'—'}</div>
        </div>
        <div class="schedule-meta">${pct==null?'—':Math.round(pct)+'%'}${r.status?` · ${escapeHtml(r.status)}`:''}</div>
        <div class="progress-track"><div class="progress-fill" style="width:${pct ?? 0}%"></div></div>
        ${r.note?`<div class="item-description">${escapeHtml(r.note)}</div>`:''}
      </div>`}).join('') : empty('Nenhum marco de cronograma registrado nesta semana.');

    els.attention.innerHTML = attention.length ? attention.map(r=>`
      <div class="attention-item">
        <div class="attention-type">${escapeHtml(r.status || 'Atenção')}</div>
        <div><div class="item-title">${escapeHtml(r.description)}</div>${r.note?`<div class="item-description">${escapeHtml(r.note)}</div>`:''}</div>
        <div class="attention-action">${renderActionTooltip(r.action)}</div>
      </div>`).join('') : empty('Nenhum ponto de atenção registrado nesta semana.');

    const total = rows.length;
    document.body.classList.toggle('compact', total > 12 || Math.max(done.length,planned.length,schedule.length,attention.length) > 5);
  }


  function indicatorForSelectedWeek() {
    if (!state.selectedProjectId || !state.selectedWeekKey) return null;
    return state.indicators
      .filter(i => i.projectId === state.selectedProjectId && weekInfo(i.date)?.key === state.selectedWeekKey)
      .sort((a,b) => a.date.localeCompare(b.date))
      .at(-1) || null;
  }

  function renderIndicatorSummary(week) {
    const snapshot = indicatorForSelectedWeek();
    const actual = snapshot?.actual;
    const planned = snapshot?.planned;
    const info = signalInfo(snapshot?.signal || '');

    els.indicatorDate.textContent = snapshot?.date ? `Ref. ${shortDate(snapshot.date)}` : (week ? 'Sem dado Project' : '—');
    els.indicatorActual.textContent = actual == null ? '—' : `${Math.round(actual)}%`;
    els.indicatorPlanned.textContent = planned == null ? '—' : `${Math.round(planned)}%`;
    els.indicatorActualBar.style.width = `${actual ?? 0}%`;
    els.indicatorPlannedBar.style.width = `${planned ?? 0}%`;

    els.signal.className = `project-signal ${info.cls}`;
    els.signalDot.textContent = info.emoji;
    els.signalText.textContent = info.text;
  }


  function currentProject() {
    return state.projects.find(p => p.id === state.selectedProjectId) || null;
  }

  function signalInfo(value) {
    const n = normalize(value);
    if (!n) return { emoji:'⚪', text:'Status não informado', cls:'project-signal-neutral' };
    if (n.includes('sem atraso') && !n.includes('atraso sem')) return { emoji:'🟢', text:'Sem atraso', cls:'project-signal-green' };
    if (n.includes('sem impacto') || n.includes('termino mantido') || n.includes('término mantido')) return { emoji:'🟡', text:'Atraso sem impacto no término', cls:'project-signal-yellow' };
    if (n.includes('com impacto') || n.includes('compromet') || n.includes('termino alterado') || n.includes('término alterado')) return { emoji:'🔴', text:'Atraso com impacto no término', cls:'project-signal-red' };
    if (n.startsWith('verde') || n.startsWith('green')) return { emoji:'🟢', text:value, cls:'project-signal-green' };
    if (n.startsWith('amarelo') || n.startsWith('yellow')) return { emoji:'🟡', text:value, cls:'project-signal-yellow' };
    if (n.startsWith('vermelho') || n.startsWith('red')) return { emoji:'🔴', text:value, cls:'project-signal-red' };
    return { emoji:'⚪', text:value, cls:'project-signal-neutral' };
  }

  function renderProjectMeta() {
    const project = currentProject();
    const heading = project ? `Resumo executivo semanal - ${project.name}` : 'Resumo executivo semanal';
    els.pageTitle.textContent = heading;
    document.title = project ? `ATLANTYX · ${heading}` : 'ATLANTYX · Resumo Executivo Semanal';
    els.teamButton.title = project ? `Ver equipe ATLANTYX de ${project.name}` : 'Ver equipe ATLANTYX';
  }

  function initials(name) {
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return 'AT';
    return (parts[0][0] + (parts.length > 1 ? parts.at(-1)[0] : '')).toUpperCase();
  }

  function teamForProject(project) {
    if (!project) return [];
    return state.teams
      .filter(member => member.projectId === project.id || normalize(member.project) === normalize(project.name))
      .sort((a,b) => {
        const ai = Number(a.id), bi = Number(b.id);
        if (Number.isFinite(ai) && Number.isFinite(bi) && ai !== bi) return ai - bi;
        return a.name.localeCompare(b.name, 'pt-BR');
      });
  }

  function openTeamModal() {
    const project = currentProject();
    els.teamProjectName.textContent = project?.name || 'Projeto não selecionado';
    const members = teamForProject(project);
    els.teamList.innerHTML = members.length ? members.map(m => `
      <div class="team-member">
        <div class="team-avatar">${escapeHtml(initials(m.name))}</div>
        <div>
          <div class="team-member-name">${escapeHtml(m.name)}</div>
          ${m.role ? `<div class="team-member-role">${escapeHtml(m.role)}</div>` : ''}
        </div>
      </div>`).join('') : `<div class="team-empty">Nenhum integrante cadastrado para este projeto.<br>Adicione pessoas na aba <strong>Equipe_projeto</strong> usando o mesmo <strong>projeto_id</strong>.</div>`;
    els.teamModal.hidden = false;
    document.body.classList.add('modal-open');
    els.teamModalClose.focus();
  }

  function closeTeamModal() {
    els.teamModal.hidden = true;
    document.body.classList.remove('modal-open');
    els.teamButton.focus();
  }

  function empty(text) { return `<div class="empty-state">${escapeHtml(text)}</div>`; }
  function cycle(select, delta, onChange) {
    const n=select.options.length; if(!n) return;
    select.selectedIndex=(select.selectedIndex+delta+n)%n; onChange();
  }

  els.client.addEventListener('change',()=>{
    state.selectedClient = els.client.value;
    state.selectedWeekKey = null;
    updateProjectOptions({ resetWeek: true });
    render();
  });

  els.project.addEventListener('change',()=>{
    state.selectedProjectId = els.project.value;
    const project = currentProject();
    if (project?.client && normalize(state.selectedClient) !== normalize(project.client)) {
      state.selectedClient = project.client;
      els.client.value = project.client;
      state.selectedWeekKey = null;
      updateProjectOptions({ resetWeek: true });
    } else {
      state.selectedWeekKey = null;
      updateWeekOptions();
    }
    render();
  });
  els.week.addEventListener('change',()=>{ state.selectedWeekKey=els.week.value; render(); });
  el('prevProject').addEventListener('click',()=>cycle(els.project,-1,()=>els.project.dispatchEvent(new Event('change'))));
  el('nextProject').addEventListener('click',()=>cycle(els.project,1,()=>els.project.dispatchEvent(new Event('change'))));
  el('prevWeek').addEventListener('click',()=>cycle(els.week,1,()=>els.week.dispatchEvent(new Event('change'))));
  el('nextWeek').addEventListener('click',()=>cycle(els.week,-1,()=>els.week.dispatchEvent(new Event('change'))));
  el('refreshButton').addEventListener('click',loadData);
  els.teamButton.addEventListener('click',openTeamModal);
  els.teamModalClose.addEventListener('click',closeTeamModal);
  els.teamModal.addEventListener('click',e=>{ if(e.target===els.teamModal) closeTeamModal(); });
  document.addEventListener('keydown',e=>{ if(e.key==='Escape' && !els.teamModal.hidden) closeTeamModal(); });

  loadData();
  if (cfg.refreshMinutes > 0) setInterval(loadData, cfg.refreshMinutes * 60 * 1000);
})();
