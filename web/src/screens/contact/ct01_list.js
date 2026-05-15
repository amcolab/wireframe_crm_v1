import { q, escapeHtml } from '../../utils/helpers.js';
import { mockContacts, mockActivities, mockProjects } from '../../utils/mockData.js';

export function init() {
  console.log('Contact screen (CT01) initialized');
  initResizer();
  renderTable(mockContacts);
  renderActivities(mockActivities);
  renderProjects(mockProjects);

  const tabs = document.querySelectorAll('[data-contact-tab]');
  const panels = document.querySelectorAll('[data-contact-panel]');

  tabs.forEach(t => {
    t.addEventListener('click', () => {
      const tab = t.getAttribute('data-contact-tab');
      tabs.forEach(x => x.classList.toggle('active', x === t));
      panels.forEach(p => p.classList.toggle('active', p.getAttribute('data-contact-panel') === tab));

      // Toggle action buttons
      const btnNewActivity = q('btnContactNewActivity');
      const btnNewProject = q('btnContactNewProject');
      if (btnNewActivity) btnNewActivity.style.display = tab === 'activities' ? 'block' : 'none';
      if (btnNewProject) btnNewProject.style.display = tab === 'projects' ? 'block' : 'none';
    });
  });

  q('btnContactNewActivity')?.addEventListener('click', () => {
    q('dlgActivityDetail')?.showModal();
  });

  q('btnContactCreateMain')?.addEventListener('click', () => {
    q('dlgContactDetailNew')?.showModal();
  });

  q('btnContactNewProject')?.addEventListener('click', () => {
    q('dlgProjectDetail')?.showModal();
  });

  q('btnContactAdvancedSearch')?.addEventListener('click', () => {
    q('dlgContactAdvancedSearch')?.showModal();
  });

  q('btnMainContactLookupCompany')?.addEventListener('click', () => {
    q('dlgCompanyLookup')?.showModal();
  });

  q('btnMainContactCreateCompany')?.addEventListener('click', () => {
    q('dlgCompanyCreate')?.showModal();
  });

  q('btnContactSearch')?.addEventListener('click', () => {
    const name = q('contactSearchName')?.value;
    const company = q('contactSearchCompany')?.value;
    
    let filtered = mockContacts;
    if (name) filtered = filtered.filter(c => (c.last + c.first).includes(name));
    if (company) filtered = filtered.filter(c => c.company && c.company.includes(company));
    
    renderTable(filtered);
  });

  q('btnContactClear')?.addEventListener('click', () => {
    if (q('contactSearchName')) q('contactSearchName').value = '';
    if (q('contactSearchCompany')) q('contactSearchCompany').value = '';
    renderTable(mockContacts);
  });
}

function renderTable(data) {
  const tbody = q('contactTableBody');
  if (!tbody) return;
  tbody.innerHTML = data.map((m, idx) => `
    <tr data-id="${10000 + idx}">
      <td>${escapeHtml(m.companyId || '-')}</td>
      <td><a class="blue-link" data-jump-company="${escapeHtml(m.company || '')}">${escapeHtml(m.company || '-')}</a></td>
      <td>${escapeHtml(m.dept || '-')}</td>
      <td>${escapeHtml(m.last || '-')}</td>
      <td>${escapeHtml(m.first || '-')}</td>
      <td>${escapeHtml(m.kana || '-')}</td>
      <td>${escapeHtml(m.tel || '-')}</td>
      <td>${escapeHtml(m.mobile || '-')}</td>
      <td>${escapeHtml(m.email || '-')}</td>
      <td>${escapeHtml(m.role || '-')}</td>
      <td>${escapeHtml(m.rank || '-')}</td>
      <td>${escapeHtml(m.pos || '-')}</td>
      <td>${escapeHtml(m.addr || '-')}</td>
    </tr>
  `).join('');

  tbody.querySelectorAll('tr').forEach(tr => {
    tr.addEventListener('click', (e) => {
      if (e.target.hasAttribute('data-jump-company')) {
        const companyName = e.target.getAttribute('data-jump-company');
        if (companyName && window.appRouter) {
          window.location.hash = 'company';
        }
        return;
      }
      tbody.querySelectorAll('tr').forEach(r => r.classList.remove('selected'));
      tr.classList.add('selected');
    });
  });

  if (data.length > 0) {
    const firstRow = tbody.querySelector('tr');
    if (firstRow) firstRow.classList.add('selected');
  }
}

function renderActivities(data) {
  const tbody = q('contactActivitiesBody');
  if (!tbody) return;
  tbody.innerHTML = data.map(a => `
    <tr>
      <td>${escapeHtml(a.date || '-')}</td>
      <td>${escapeHtml(a.rep || '-')}</td>
      <td><span class="type-badge ${a.typeClass || ''}">${escapeHtml(a.type || '-')}</span></td>
      <td>${escapeHtml(a.comment || '-')}</td>
      <td>${escapeHtml(a.purpose || '-')}</td>
    </tr>
  `).join('');
}

function renderProjects(data) {
  const tbody = q('contactProjectsBody');
  if (!tbody) return;
  tbody.innerHTML = data.map(p => `
    <tr>
      <td>${escapeHtml(p.issueDate || '-')}</td>
      <td>${escapeHtml(p.saleDate || '-')}</td>
      <td><span class="status-badge ${p.status === '受注' ? 'status-won' : 'status-lost'}">${escapeHtml(p.status || '-')}</span></td>
      <td>${escapeHtml(p.rep || '-')}</td>
      <td>${escapeHtml(p.name || '-')}</td>
      <td>${escapeHtml(p.contact || '-')}</td>
      <td>${escapeHtml(p.summary || '-')}</td>
      <td>${escapeHtml(p.initial || '-')}</td>
      <td>${escapeHtml(p.motivation || '-')}</td>
      <td>${escapeHtml(p.method || '-')}</td>
    </tr>
  `).join('');
}

function initResizer() {
  const resizer = q('contact-resizer');
  const container = document.querySelector('#contact-root .company-main');
  
  if (!resizer || !container) return;
  
  let isResizing = false;
  
  resizer.addEventListener('mousedown', (e) => {
    isResizing = true;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
    resizer.classList.add('active');
  });
  
  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    
    const containerRect = container.getBoundingClientRect();
    const relativeY = e.clientY - containerRect.top;
    
    const minGridHeight = 150;
    const minDetailHeight = 200;
    const maxHeight = containerRect.height - minDetailHeight;
    
    let newHeight = relativeY - 6;
    if (newHeight < minGridHeight) newHeight = minGridHeight;
    if (newHeight > maxHeight) newHeight = maxHeight;
    
    container.style.setProperty('--grid-height', `${newHeight}px`);
  });
  
  document.addEventListener('mouseup', () => {
    if (isResizing) {
      isResizing = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      resizer.classList.remove('active');
    }
  });
}
