import { q, escapeHtml } from '../../utils/helpers.js';
import { mockActivities } from '../../utils/mockData.js';

export function init() {
  console.log('Activity screen (AT01) initialized');
  initResizer();
  renderTable(mockActivities);

  // Search buttons
  q('btnActivitySearch')?.addEventListener('click', () => {
    console.log('Search activity clicked');
    const type = q('activitySearchType')?.value;
    const rep = q('activitySearchSalesRep')?.value;
    const company = q('activitySearchCompany')?.value;
    
    let filtered = mockActivities;
    if (type) filtered = filtered.filter(a => a.type === type);
    if (rep) filtered = filtered.filter(a => a.rep.includes(rep));
    if (company) filtered = filtered.filter(a => a.company.includes(company));
    
    renderTable(filtered);
  });

  q('btnActivityClear')?.addEventListener('click', () => {
    if (q('activitySearchType')) q('activitySearchType').value = '';
    if (q('activitySearchSalesRep')) q('activitySearchSalesRep').value = '';
    if (q('activitySearchCompany')) q('activitySearchCompany').value = '';
    renderTable(mockActivities);
  });

  q('btnActivityAdvancedSearch')?.addEventListener('click', () => {
    q('dlgActivityAdvancedSearch')?.showModal();
  });

  q('btnActivityNewMain')?.addEventListener('click', () => {
    const dlg = q('dlgActivityDetail');
    if (dlg) {
      if (typeof dlg.showModal === 'function') {
        dlg.showModal();
        q('formActivityDetail')?.reset();
      } else {
        console.error('dlgActivityDetail is not a dialog element');
      }
    }
  });

  // Modal Lookups
  q('btnActivityContactLookup')?.addEventListener('click', () => {
    q('dlgContactLookup')?.showModal();
  });

  q('btnActivityContactNew')?.addEventListener('click', () => {
    q('dlgContactDetailNew')?.showModal();
  });

  q('btnActivityProjectLookup')?.addEventListener('click', () => {
    q('dlgProjectLookup')?.showModal();
  });

  q('btnActivityProjectNew')?.addEventListener('click', () => {
    q('dlgProjectDetail')?.showModal();
  });

  // Detail panel lookups
  q('btnAtDetailContactLookup')?.addEventListener('click', () => {
    q('dlgContactLookup')?.showModal();
  });

  q('btnAtDetailContactNew')?.addEventListener('click', () => {
    q('dlgContactDetailNew')?.showModal();
  });

  q('btnAtDetailProjectLookup')?.addEventListener('click', () => {
    q('dlgProjectLookup')?.showModal();
  });

  q('btnAtDetailProjectNew')?.addEventListener('click', () => {
    q('dlgProjectDetail')?.showModal();
  });
}

function renderTable(data) {
  const tbody = q('activityTableBody');
  if (!tbody) return;
  tbody.innerHTML = data.map(item => `
    <tr data-id="${item.id}">
      <td>${item.date}</td>
      <td>${item.time}</td>
      <td>${item.rep}</td>
      <td><span class="${item.typeClass}">${item.type}</span></td>
      <td><a class="blue-link">${item.company}</a></td>
      <td>${item.contact}</td>
      <td class="comment-cell">${item.comment}</td>
    </tr>
  `).join('');

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
  setVal('atDetailId', item.id);
  setVal('atDetailType', item.type);
  setVal('atDetailPurpose', item.purpose);
  setVal('atDetailSalesRep', item.rep + ' [企画部]');
  setVal('atDetailCompanyName', item.company);
  setVal('atDetailContact', item.contact + ' 瑞葵 [' + item.company + ']');
  // Safety: replace instead of replaceAll for compatibility
  setVal('atDetailDate', item.date ? item.date.replace(/\//g, '-') : '');
  setVal('atDetailStartTime', item.time);
  setVal('atDetailComment', item.comment);
}

function initResizer() {
  const resizer = q('activity-resizer');
  const container = document.querySelector('#activity-root .company-main');
  
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
