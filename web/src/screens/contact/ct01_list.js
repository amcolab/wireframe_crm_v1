import { q, escapeHtml } from '../../utils/helpers.js';
import { mockContacts } from '../../utils/mockData.js';

export function init() {
  console.log('Contact screen (CT01) initialized');
  renderTable(mockContacts);

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
