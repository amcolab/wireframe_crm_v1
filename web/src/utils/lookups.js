import { q, escapeHtml } from './helpers.js';
import { mockCompanies } from './mockData.js';

export function initGlobalLookups() {
  // Initialize Multi-select dropdowns globally
  const initMultiSelects = () => {
    document.querySelectorAll('.multi-select-dropdown').forEach(dropdown => {
      // Avoid double binding
      if (dropdown.dataset.initialized) return;
      dropdown.dataset.initialized = 'true';

      const trigger = dropdown.querySelector('.multi-select-trigger');
      const placeholder = dropdown.dataset.placeholder || '選択..';

      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.multi-select-dropdown').forEach(d => {
          if (d !== dropdown) d.classList.remove('active');
        });
        dropdown.classList.toggle('active');
      });

      const checkboxes = dropdown.querySelectorAll('input[type="checkbox"]');
      checkboxes.forEach(cb => {
        cb.addEventListener('click', (e) => e.stopPropagation());
        cb.addEventListener('change', () => {
          const selected = Array.from(checkboxes)
            .filter(c => c.checked)
            .map(c => c.parentElement.textContent.trim());

          if (selected.length === 0) {
            trigger.textContent = placeholder;
          } else if (selected.length <= 2) {
            trigger.textContent = selected.join(', ');
          } else {
            trigger.textContent = `${selected.length}項目選択中`;
          }
        });
      });
    });
  };

  // Run on init
  initMultiSelects();

  // Also close dropdowns on outside click
  document.addEventListener('click', () => {
    document.querySelectorAll('.multi-select-dropdown').forEach(d => {
      d.classList.remove('active');
    });
  });

  // Company Lookup state
  const dlgLookup = q('dlgCompanyLookup');
  const lookupTbody = q('lookupCompanyBody');
  const dlgContactLookup = q('dlgContactLookup');
  const contactLookupTbody = document.querySelector('.contact-table tbody');
  const dlgProjectLookup = q('dlgProjectLookup');
  const projectLookupTbody = document.querySelector('.project-table tbody');
  let tempLookupSelection = null;
  let tempContactSelection = null;
  let tempProjectSelection = null;
  
  let lookupState = {
    page: 1,
    pageSize: 100,
    filtered: [...mockCompanies]
  };

  const renderLookupResults = (filters = null) => {
    if (!lookupTbody) return;
    
    if (filters) {
      lookupState.filtered = mockCompanies.filter(c => {
        if (filters.name && !c.name.includes(filters.name)) return false;
        if (filters.keyword) {
          const kw = filters.keyword.toLowerCase();
          return Object.values(c).some(val => String(val).toLowerCase().includes(kw));
        }
        return true;
      });
      lookupState.page = 1;
    }

    const total = lookupState.filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / lookupState.pageSize));
    if (lookupState.page > totalPages) lookupState.page = totalPages;

    const startIdx = (lookupState.page - 1) * lookupState.pageSize;
    const endIdx = Math.min(startIdx + lookupState.pageSize, total);
    const rows = lookupState.filtered.slice(startIdx, endIdx);

    lookupTbody.innerHTML = rows.map(c => `
      <tr data-id="${c.id}" class="${tempLookupSelection?.id === c.id ? 'selected' : ''}">
        <td>${c.id}</td>
        <td>${c.name}</td>
        <td>${c.tel || ''}</td>
        <td>${c.addr || ''}</td>
        <td>${c.industry || ''}</td>
        <td>${c.biz || ''}</td>
        <td>${c.scale || ''}</td>
        <td>${c.type || ''}</td>
        <td>${c.employees || '0'}</td>
        <td>${c.area || ''}</td>
        <td>${c.pref || ''}</td>
        <td>${c.remarks || ''}</td>
      </tr>
    `).join('');

    // Bind selection
    lookupTbody.querySelectorAll('tr').forEach(tr => {
      tr.addEventListener('click', () => {
        const id = tr.dataset.id;
        lookupTbody.querySelectorAll('tr').forEach(r => r.classList.remove('selected'));
        tr.classList.add('selected');
        tempLookupSelection = lookupState.filtered.find(c => c.id === id);
      });
    });

    // Update Pager UI
    const totalCountEl = q('lookupTotalCount');
    const rangeStartEl = q('lookupRangeStart');
    const rangeEndEl = q('lookupRangeEnd');
    const pageTotalEl = q('lookupPageTotal');
    const pageSelect = q('lookupPageSelect');
    const pageNumbers = q('lookupPageNumbers');

    if (totalCountEl) totalCountEl.textContent = total;
    if (rangeStartEl) rangeStartEl.textContent = total > 0 ? (startIdx + 1) : 0;
    if (rangeEndEl) rangeEndEl.textContent = endIdx;
    if (pageTotalEl) pageTotalEl.textContent = `/ ${totalPages}`;

    if (pageSelect) {
      pageSelect.innerHTML = '';
      for (let i = 1; i <= totalPages; i++) {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = i;
        if (i === lookupState.page) opt.selected = true;
        pageSelect.appendChild(opt);
      }
    }

    if (pageNumbers) {
      pageNumbers.innerHTML = '';
      const maxBtn = 5;
      let startP = Math.max(1, lookupState.page - 2);
      let endP = Math.min(totalPages, startP + maxBtn - 1);
      if (endP - startP < maxBtn - 1) startP = Math.max(1, endP - maxBtn + 1);

      for (let i = startP; i <= endP; i++) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `page-num-btn ${i === lookupState.page ? 'active' : ''}`;
        btn.textContent = i;
        btn.onclick = () => { lookupState.page = i; renderLookupResults(); };
        pageNumbers.appendChild(btn);
      }
    }
  };

  // Bind Pager Buttons
  q('btnLookupFirstPage')?.addEventListener('click', () => { lookupState.page = 1; renderLookupResults(); });
  q('btnLookupPrevPage')?.addEventListener('click', () => { if (lookupState.page > 1) { lookupState.page--; renderLookupResults(); } });
  q('btnLookupNextPage')?.addEventListener('click', () => { 
    const totalPages = Math.ceil(lookupState.filtered.length / lookupState.pageSize);
    if (lookupState.page < totalPages) { lookupState.page++; renderLookupResults(); } 
  });
  q('btnLookupLastPage')?.addEventListener('click', () => { 
    lookupState.page = Math.ceil(lookupState.filtered.length / lookupState.pageSize);
    renderLookupResults(); 
  });

  q('lookupPageSelect')?.addEventListener('change', (e) => {
    lookupState.page = parseInt(e.target.value) || 1;
    renderLookupResults();
  });

  q('lookupPageSize')?.addEventListener('change', (e) => {
    lookupState.pageSize = parseInt(e.target.value) || 100;
    lookupState.page = 1;
    renderLookupResults();
  });

  // Contact Lookup state
  let contactLookupState = {
    page: 1,
    pageSize: 100,
    filtered: [...(window.mockContacts || [])]
  };

  // Import mockContacts if not globally available
  import('./mockData.js').then(m => {
    contactLookupState.filtered = [...m.mockContacts];
  });

  const renderContactLookupResults = (filters = null) => {
    if (!contactLookupTbody) return;

    if (filters) {
      import('./mockData.js').then(m => {
        contactLookupState.filtered = m.mockContacts.filter(c => {
          if (filters.name && !`${c.last}${c.first}`.includes(filters.name)) return false;
          if (filters.keyword) {
            const kw = filters.keyword.toLowerCase();
            return Object.values(c).some(val => String(val).toLowerCase().includes(kw));
          }
          return true;
        });
        contactLookupState.page = 1;
        renderContactLookupResults();
      });
      return;
    }

    const total = contactLookupState.filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / contactLookupState.pageSize));
    if (contactLookupState.page > totalPages) contactLookupState.page = totalPages;

    const startIdx = (contactLookupState.page - 1) * contactLookupState.pageSize;
    const endIdx = Math.min(startIdx + contactLookupState.pageSize, total);
    const rows = contactLookupState.filtered.slice(startIdx, endIdx);

    contactLookupTbody.innerHTML = rows.map(c => `
      <tr data-id="${c.last}-${c.first}" class="${tempContactSelection?.last === c.last && tempContactSelection?.first === c.first ? 'selected' : ''}">
        <td>10001</td>
        <td>株式会社サンプル商事</td>
        <td>${c.dept || ''}</td>
        <td>${c.last}</td>
        <td>${c.first}</td>
        <td>${c.kana || ''}</td>
        <td>${c.tel || ''}</td>
        <td>${c.mobile || ''}</td>
      </tr>
    `).join('');

    // Bind selection
    contactLookupTbody.querySelectorAll('tr').forEach(tr => {
      tr.addEventListener('click', () => {
        const id = tr.dataset.id;
        contactLookupTbody.querySelectorAll('tr').forEach(r => r.classList.remove('selected'));
        tr.classList.add('selected');
        const [last, first] = id.split('-');
        tempContactSelection = contactLookupState.filtered.find(c => c.last === last && c.first === first);
      });
    });

    // Update Pager UI
    const totalCountEl = q('contactLookupTotalCount');
    const rangeStartEl = q('contactLookupRangeStart');
    const rangeEndEl = q('contactLookupRangeEnd');
    const pageTotalEl = q('contactLookupPageTotal');
    const pageSelect = q('contactLookupPageSelect');
    const pageNumbers = q('contactLookupPageNumbers');

    if (totalCountEl) totalCountEl.textContent = total;
    if (rangeStartEl) rangeStartEl.textContent = total > 0 ? (startIdx + 1) : 0;
    if (rangeEndEl) rangeEndEl.textContent = endIdx;
    if (pageTotalEl) pageTotalEl.textContent = `/ ${totalPages}`;

    if (pageSelect) {
      pageSelect.innerHTML = '';
      for (let i = 1; i <= totalPages; i++) {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = i;
        if (i === contactLookupState.page) opt.selected = true;
        pageSelect.appendChild(opt);
      }
    }

    if (pageNumbers) {
      pageNumbers.innerHTML = '';
      const maxBtn = 5;
      let startP = Math.max(1, contactLookupState.page - 2);
      let endP = Math.min(totalPages, startP + maxBtn - 1);
      if (endP - startP < maxBtn - 1) startP = Math.max(1, endP - maxBtn + 1);

      for (let i = startP; i <= endP; i++) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `page-num-btn ${i === contactLookupState.page ? 'active' : ''}`;
        btn.textContent = i;
        btn.onclick = () => { contactLookupState.page = i; renderContactLookupResults(); };
        pageNumbers.appendChild(btn);
      }
    }
  };

  // Bind Pager Buttons for Contact Lookup
  q('btnContactLookupFirstPage')?.addEventListener('click', () => { contactLookupState.page = 1; renderContactLookupResults(); });
  q('btnContactLookupPrevPage')?.addEventListener('click', () => { if (contactLookupState.page > 1) { contactLookupState.page--; renderContactLookupResults(); } });
  q('btnContactLookupNextPage')?.addEventListener('click', () => { 
    const totalPages = Math.ceil(contactLookupState.filtered.length / contactLookupState.pageSize);
    if (contactLookupState.page < totalPages) { contactLookupState.page++; renderContactLookupResults(); } 
  });
  q('btnContactLookupLastPage')?.addEventListener('click', () => { 
    contactLookupState.page = Math.ceil(contactLookupState.filtered.length / contactLookupState.pageSize);
    renderContactLookupResults(); 
  });

  q('contactLookupPageSelect')?.addEventListener('change', (e) => {
    contactLookupState.page = parseInt(e.target.value) || 1;
    renderContactLookupResults();
  });

  q('contactLookupPageSize')?.addEventListener('change', (e) => {
    contactLookupState.pageSize = parseInt(e.target.value) || 100;
    contactLookupState.page = 1;
    renderContactLookupResults();
  });

  // Auto-render on dialog open
  if (dlgLookup) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'open' && dlgLookup.open) {
          renderLookupResults();
          initMultiSelects();
        }
      });
    });
    observer.observe(dlgLookup, { attributes: true });
  }

  if (dlgContactLookup) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'open' && dlgContactLookup.open) {
          renderContactLookupResults();
          initMultiSelects();
        }
      });
    });
    observer.observe(dlgContactLookup, { attributes: true });
  }

  // Project Lookup state
  let projectLookupState = {
    page: 1,
    pageSize: 100,
    filtered: []
  };

  const renderProjectLookupResults = (filters = null) => {
    if (!projectLookupTbody) return;

    if (filters) {
      import('./mockData.js').then(m => {
        projectLookupState.filtered = m.mockProjects.filter(p => {
          if (filters.name && !p.name.includes(filters.name)) return false;
          // Add more filters as needed
          return true;
        });
        projectLookupState.page = 1;
        renderProjectLookupResults();
      });
      return;
    }

    if (projectLookupState.filtered.length === 0) {
      import('./mockData.js').then(m => {
        projectLookupState.filtered = [...m.mockProjects];
        renderProjectLookupResults();
      });
      return;
    }

    const total = projectLookupState.filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / projectLookupState.pageSize));
    if (projectLookupState.page > totalPages) projectLookupState.page = totalPages;

    const startIdx = (projectLookupState.page - 1) * projectLookupState.pageSize;
    const endIdx = Math.min(startIdx + projectLookupState.pageSize, total);
    const rows = projectLookupState.filtered.slice(startIdx, endIdx);

    projectLookupTbody.innerHTML = rows.map(p => `
      <tr data-id="${p.id}" class="${tempProjectSelection?.id === p.id ? 'selected' : ''}">
        <td>${p.issueDate || ''}</td>
        <td>${p.followDate || ''}</td>
        <td><span class="status-badge ${p.status === '受注' ? 'status-won' : 'status-lost'}">${p.status}</span></td>
        <td>${p.rep || ''}</td>
        <td>${p.company || ''}</td>
        <td>${p.contact || ''}</td>
        <td class="text-link">${p.name}</td>
        <td class="text-muted text-truncate" style="max-width: 200px;">${p.summary || ''}</td>
        <td>${p.stage1 || '-'}</td>
        <td>${p.stage2 || '-'}</td>
        <td>${p.stage3 || '-'}</td>
        <td>${p.stage4 || '-'}</td>
        <td>${p.motivation || ''}</td>
        <td>${p.method || ''}</td>
        <td>${p.competitor || '-'}</td>
        <td>${p.initial || ''}</td>
        <td>${p.revised || '-'}</td>
        <td>${p.free1 || '-'}</td>
        <td>${p.free2 || '-'}</td>
        <td>${p.free3 || '-'}</td>
      </tr>
    `).join('');

    // Bind selection
    projectLookupTbody.querySelectorAll('tr').forEach(tr => {
      tr.addEventListener('click', () => {
        const id = tr.dataset.id;
        projectLookupTbody.querySelectorAll('tr').forEach(r => r.classList.remove('selected'));
        tr.classList.add('selected');
        tempProjectSelection = projectLookupState.filtered.find(p => p.id === id);
      });
    });

    // Update Pager UI
    const totalCountEl = q('projectLookupTotalCount');
    const rangeStartEl = q('projectLookupRangeStart');
    const rangeEndEl = q('projectLookupRangeEnd');
    const pageTotalEl = q('projectLookupPageTotal');
    const pageSelect = q('projectLookupPageSelect');
    const pageNumbers = q('projectLookupPageNumbers');

    if (totalCountEl) totalCountEl.textContent = total;
    if (rangeStartEl) rangeStartEl.textContent = total > 0 ? (startIdx + 1) : 0;
    if (rangeEndEl) rangeEndEl.textContent = endIdx;
    if (pageTotalEl) pageTotalEl.textContent = `/ ${totalPages}`;

    if (pageSelect) {
      pageSelect.innerHTML = '';
      for (let i = 1; i <= totalPages; i++) {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = i;
        if (i === projectLookupState.page) opt.selected = true;
        pageSelect.appendChild(opt);
      }
    }

    if (pageNumbers) {
      pageNumbers.innerHTML = '';
      const maxBtn = 5;
      let startP = Math.max(1, projectLookupState.page - 2);
      let endP = Math.min(totalPages, startP + maxBtn - 1);
      if (endP - startP < maxBtn - 1) startP = Math.max(1, endP - maxBtn + 1);

      for (let i = startP; i <= endP; i++) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `page-num-btn ${i === projectLookupState.page ? 'active' : ''}`;
        btn.textContent = i;
        btn.onclick = () => { projectLookupState.page = i; renderProjectLookupResults(); };
        pageNumbers.appendChild(btn);
      }
    }
  };

  // Bind Pager Buttons for Project Lookup
  q('btnProjectLookupFirstPage')?.addEventListener('click', () => { projectLookupState.page = 1; renderProjectLookupResults(); });
  q('btnProjectLookupPrevPage')?.addEventListener('click', () => { if (projectLookupState.page > 1) { projectLookupState.page--; renderProjectLookupResults(); } });
  q('btnProjectLookupNextPage')?.addEventListener('click', () => { 
    const totalPages = Math.ceil(projectLookupState.filtered.length / projectLookupState.pageSize);
    if (projectLookupState.page < totalPages) { projectLookupState.page++; renderProjectLookupResults(); } 
  });
  q('btnProjectLookupLastPage')?.addEventListener('click', () => { 
    projectLookupState.page = Math.ceil(projectLookupState.filtered.length / projectLookupState.pageSize);
    renderProjectLookupResults(); 
  });

  q('projectLookupPageSelect')?.addEventListener('change', (e) => {
    projectLookupState.page = parseInt(e.target.value) || 1;
    renderProjectLookupResults();
  });

  q('projectLookupPageSize')?.addEventListener('change', (e) => {
    projectLookupState.pageSize = parseInt(e.target.value) || 100;
    projectLookupState.page = 1;
    renderProjectLookupResults();
  });

  if (dlgProjectLookup) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'open' && dlgProjectLookup.open) {
          renderProjectLookupResults();
          initMultiSelects();
        }
      });
    });
    observer.observe(dlgProjectLookup, { attributes: true });
  }

  q('btnLookupSearch')?.addEventListener('click', (e) => {
    e.preventDefault();
    const form = q('formCompanyLookup');
    if (!form) return;
    const filters = {
      name: form.name?.value,
      keyword: form.keyword?.value
    };
    renderLookupResults(filters);
  });

  q('btnLookupClear')?.addEventListener('click', (e) => {
    const form = q('formCompanyLookup');
    if (form) form.reset();
    renderLookupResults({});
  });

  q('btnLookupSelect')?.addEventListener('click', () => {
    if (!tempLookupSelection) {
      alert('会社を選択してください');
      return;
    }
    const c = tempLookupSelection;
    const fields = [
      'contactDetailCompanyName', 'mainContactCompanyName', 'atDetailCompanyName', 'prDetailCompanyName', 'companySearchCompany'
    ];
    fields.forEach(id => {
      const el = q(id);
      if (el) el.value = c.name;
    });
    dlgLookup?.close();
  });

  // Global search history trigger
  document.addEventListener('click', (e) => {
    if (e.target.closest('.btn-search-history')) {
      e.preventDefault();
      const historyBody = q('searchHistoryBody');
      if (historyBody && historyBody.children.length === 0) {
        historyBody.innerHTML = `
          <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.2s;">
            <td style="padding: 14px; text-align: center; color: #64748b; font-weight: 500;">1</td>
            <td style="padding: 14px; font-weight: 500; cursor: pointer; color: #1e293b;">(新しい条件)</td>
            <td style="padding: 14px; text-align: center;">
              <button type="button" class="btn" style="padding: 4px 12px; font-size: 13px; border: 1px solid #ccc; background: #fff; border-radius: 4px; color: #333;">編集</button>
            </td>
          </tr>
        `;
      }
      q('dlgSearchHistory')?.showModal();
    }
  });
}
