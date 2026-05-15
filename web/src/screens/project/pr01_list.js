import { q, escapeHtml } from '../../utils/helpers.js';
import { mockProjects } from '../../utils/mockData.js';

export function init() {
  console.log('Project screen (PR01) initialized');
  initResizer();
  renderTable(mockProjects);

  // Search logic
  q('btnProjectSearch')?.addEventListener('click', () => {
    const name = q('projectSearchName')?.value;
    const company = q('projectSearchCompany')?.value;
    
    let filtered = mockProjects;
    if (name) filtered = filtered.filter(p => p.name.includes(name));
    if (company) filtered = filtered.filter(p => p.company.includes(company));
    
    renderTable(filtered);
  });

  q('btnProjectClear')?.addEventListener('click', () => {
    if (q('projectSearchName')) q('projectSearchName').value = '';
    if (q('projectSearchCompany')) q('projectSearchCompany').value = '';
    renderTable(mockProjects);
  });

  const tabs = document.querySelectorAll('[data-pr-tab]');
  const panels = document.querySelectorAll('[data-pr-panel]');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.dataset.prTab;
      panels.forEach(p => {
        p.style.display = p.dataset.prPanel === target ? 'block' : 'none';
      });
    });
  });

  q('btnProjectAdvancedSearch')?.addEventListener('click', () => {
    q('dlgProjectAdvancedSearch')?.showModal();
  });
  q('btnProjectNewMain')?.addEventListener('click', () => {
    q('dlgProjectDetail')?.showModal();
  });

  q('btnPrTabNewActivity')?.addEventListener('click', () => {
    q('dlgActivityDetail')?.showModal();
  });
  q('btnPrTabNewProject')?.addEventListener('click', () => {
    q('dlgProjectDetail')?.showModal();
  });
}

function renderTable(data) {
  const tbody = q('projectTableBody');
  if (!tbody) return;
  tbody.innerHTML = data.map(item => `
    <tr data-id="${item.id}">
      <td>${item.issueDate}</td>
      <td>${item.followDate}</td>
      <td>${item.status}</td>
      <td>${item.rep}</td>
      <td><a class="blue-link">${item.company}</a></td>
      <td>${item.contact}</td>
      <td>${item.name}</td>
      <td class="comment-cell">${item.summary}</td>
      <td style="text-align: center;"><input type="checkbox" ${item.stage1 ? 'checked' : ''} disabled></td>
      <td style="text-align: center;"><input type="checkbox" ${item.stage2 ? 'checked' : ''} disabled></td>
      <td style="text-align: center;"><input type="checkbox" ${item.stage3 ? 'checked' : ''} disabled></td>
      <td style="text-align: center;"><input type="checkbox" ${item.stage4 ? 'checked' : ''} disabled></td>
      <td>${item.motivation || ''}</td>
      <td>${item.method || ''}</td>
      <td>${item.competitor || ''}</td>
      <td>${item.initial || ''}</td>
      <td>${item.revised || ''}</td>
      <td>${item.free1 || ''}</td>
      <td>${item.free2 || ''}</td>
      <td>${item.free3 || ''}</td>
    </tr>
  `).join('');

  const totalCount = q('projectTotalCount');
  if (totalCount) totalCount.textContent = data.length;
  // Update footer text "1 - 1" to "1 - N"
  const meta = document.querySelector('.company-grid-meta');
  if (meta) meta.innerHTML = `全 <span id="projectTotalCount">${data.length}</span> 件 &nbsp; 1 - ${data.length}`;

  tbody.querySelectorAll('tr').forEach(tr => {
    tr.addEventListener('click', () => {
      tbody.querySelectorAll('tr').forEach(r => r.classList.remove('selected'));
      tr.classList.add('selected');
      const id = tr.dataset.id;
      const selected = data.find(d => d.id === id);
      if (selected) fillDetail(selected);
    });
  });

  if (data.length > 0) {
    const firstRow = tbody.querySelector('tr');
    if (firstRow) firstRow.classList.add('selected');
    fillDetail(data[0]);
  }
}

function fillDetail(item) {
  if (!item) return;
  const setVal = (id, val) => {
    const el = q(id);
    if (el) el.value = val || '';
  };
  setVal('prDetailId', item.id);
  setVal('prDetailName', item.name);
  setVal('prDetailSummary', item.summary);
  setVal('prDetailStatus', item.status);
  setVal('prDetailSalesRep', item.rep + ' [営業部]');
  setVal('prDetailCompanyName', item.company);
  setVal('prDetailContact', item.contact + ' 瑞葵 [' + item.company + ']');
  setVal('prDetailIssueDate', item.issueDate ? item.issueDate.replace(/\//g, '-') : '');
  setVal('prDetailFollowUp', item.followDate ? item.followDate.replace(/\//g, '-') : '');
}

function initResizer() {
  const resizer = q('project-resizer');
  const container = document.querySelector('#project-root .company-main');
  
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
