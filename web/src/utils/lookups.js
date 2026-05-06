import { q, escapeHtml } from './helpers.js';
import { mockCompanies } from './mockData.js';

export function initGlobalLookups() {
  // Company Lookup logic
  const dlgLookup = q('dlgCompanyLookup');
  const lookupTbody = q('lookupTableBody');
  let tempLookupSelection = null;

  const renderLookupResults = (filters = {}) => {
    if (!lookupTbody) return;
    lookupTbody.innerHTML = '';

    const filtered = mockCompanies.filter(c => {
      if (filters.name && !c.name.includes(filters.name)) return false;
      if (filters.keyword) {
        const kw = filters.keyword.toLowerCase();
        return Object.values(c).some(val => String(val).toLowerCase().includes(kw));
      }
      return true;
    });

    filtered.forEach(c => {
      const tr = document.createElement('tr');
      tr.dataset.id = c.id;
      tr.innerHTML = `
        <td>${c.id}</td>
        <td>${c.name}</td>
        <td>${c.tel || ''}</td>
        <td>${c.addr || ''}</td>
        <td>${c.industry || ''}</td>
        <td>${c.biz || ''}</td>
        <td>${c.scale || ''}</td>
        <td>${c.type || ''}</td>
      `;
      tr.addEventListener('click', () => {
        lookupTbody.querySelectorAll('tr').forEach(r => r.classList.remove('selected'));
        tr.classList.add('selected');
        tempLookupSelection = c;
      });
      lookupTbody.appendChild(tr);
    });
  };

  q('btnLookupSearch')?.addEventListener('click', (e) => {
    e.preventDefault();
    const form = q('formCompanyLookup');
    if (!form) return;
    const filters = {
      name: form.name.value,
      keyword: form.keyword.value
    };
    renderLookupResults(filters);
  });

  q('btnLookupClear')?.addEventListener('click', (e) => {
    const form = q('formCompanyLookup');
    if (form) form.reset();
    renderLookupResults();
  });

  q('btnLookupSelect')?.addEventListener('click', () => {
    if (!tempLookupSelection) {
      alert('会社を選択してください');
      return;
    }
    const c = tempLookupSelection;
    // Update relevant fields in whatever screen is active
    const fields = [
      'contactDetailCompanyName', 'mainContactCompanyName', 'atDetailCompanyName', 'prDetailCompanyName'
    ];
    fields.forEach(id => {
      const el = q(id);
      if (el) el.value = c.name;
    });
    
    dlgLookup?.close();
  });

  // Contact Lookup logic (Placeholder)
  q('dlgContactLookup .dlg-actions button:last-child')?.addEventListener('click', () => {
    const contactInput = q('atDetailContact') || q('prDetailContact');
    if (contactInput) {
      contactInput.value = '山田 太郎 [サンプル商事]'; // Mock
    }
    q('dlgContactLookup')?.close();
  });

  // Project Lookup logic (Placeholder)
  q('btnProjectSelect')?.addEventListener('click', () => {
    const projectInput = q('atDetailProjectName');
    if (projectInput) {
      projectInput.value = 'サーバー導入案件'; // Mock
    }
    q('dlgProjectLookup')?.close();
  });
}
