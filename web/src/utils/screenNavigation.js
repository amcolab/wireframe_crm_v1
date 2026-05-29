const PENDING_COMPANY_SEARCH_KEY = 'smos.pendingCompanySearch';
const PENDING_CONTACT_SEARCH_KEY = 'smos.pendingContactSearch';
const PENDING_ACTIVITY_SEARCH_KEY = 'smos.pendingActivitySearch';
const PENDING_PROJECT_SEARCH_KEY = 'smos.pendingProjectSearch';

export function setPendingCompanySearch({ name = '' } = {}) {
  try {
    sessionStorage.setItem(
      PENDING_COMPANY_SEARCH_KEY,
      JSON.stringify({ name: String(name || '') }),
    );
  } catch {
    /* ignore */
  }
}

export function takePendingCompanySearch() {
  try {
    const raw = sessionStorage.getItem(PENDING_COMPANY_SEARCH_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(PENDING_COMPANY_SEARCH_KEY);
    const data = JSON.parse(raw);
    return { name: data?.name ?? '' };
  } catch {
    return null;
  }
}

/** Navigate to CP01 and run search after screen loads. */
export function navigateToCompanySearch({ name = '' } = {}) {
  setPendingCompanySearch({ name });
  if (window.appRouter?.navigate) {
    window.appRouter.navigate('company');
    return;
  }
  window.location.hash = 'company';
}

export function setPendingContactSearch({ company = '', name = '' } = {}) {
  try {
    sessionStorage.setItem(
      PENDING_CONTACT_SEARCH_KEY,
      JSON.stringify({ company: String(company || ''), name: String(name || '') })
    );
  } catch {
    /* ignore */
  }
}

export function takePendingContactSearch() {
  try {
    const raw = sessionStorage.getItem(PENDING_CONTACT_SEARCH_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(PENDING_CONTACT_SEARCH_KEY);
    const data = JSON.parse(raw);
    return {
      company: data?.company ?? '',
      name: data?.name ?? '',
    };
  } catch {
    return null;
  }
}

/** Navigate to CT01 and run search after screen loads. */
export function navigateToContactSearch({ company = '', name = '' } = {}) {
  setPendingContactSearch({ company, name });
  if (window.appRouter?.navigate) {
    window.appRouter.navigate('contact');
    return;
  }
  window.location.hash = 'contact';
}

export function setPendingActivitySearch({ company = '', contact = '', type = '' } = {}) {
  try {
    sessionStorage.setItem(
      PENDING_ACTIVITY_SEARCH_KEY,
      JSON.stringify({
        company: String(company || ''),
        contact: String(contact || ''),
        type: String(type || ''),
      }),
    );
  } catch {
    /* ignore */
  }
}

export function takePendingActivitySearch() {
  try {
    const raw = sessionStorage.getItem(PENDING_ACTIVITY_SEARCH_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(PENDING_ACTIVITY_SEARCH_KEY);
    const data = JSON.parse(raw);
    return {
      company: data?.company ?? '',
      contact: data?.contact ?? '',
      type: data?.type ?? '',
    };
  } catch {
    return null;
  }
}

export function navigateToActivitySearch({ company = '', contact = '', type = '' } = {}) {
  setPendingActivitySearch({ company, contact, type });
  if (window.appRouter?.navigate) {
    window.appRouter.navigate('activity');
    return;
  }
  window.location.hash = 'activity';
}

export function setPendingProjectSearch({ company = '', rep = '', name = '' } = {}) {
  try {
    sessionStorage.setItem(
      PENDING_PROJECT_SEARCH_KEY,
      JSON.stringify({
        company: String(company || ''),
        rep: String(rep || ''),
        name: String(name || ''),
      }),
    );
  } catch {
    /* ignore */
  }
}

export function takePendingProjectSearch() {
  try {
    const raw = sessionStorage.getItem(PENDING_PROJECT_SEARCH_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(PENDING_PROJECT_SEARCH_KEY);
    const data = JSON.parse(raw);
    return {
      company: data?.company ?? '',
      rep: data?.rep ?? '',
      name: data?.name ?? '',
    };
  } catch {
    return null;
  }
}

export function navigateToProjectSearch({ company = '', rep = '', name = '' } = {}) {
  setPendingProjectSearch({ company, rep, name });
  if (window.appRouter?.navigate) {
    window.appRouter.navigate('project');
    return;
  }
  window.location.hash = 'project';
}

/** Delegate clicks on [data-goto-company|contact|activity|project] within a screen root. */
export function bindCrossScreenLinks(root) {
  if (!root || root.dataset.navBound === '1') return;
  root.dataset.navBound = '1';

  root.addEventListener('click', (e) => {
    const companyLink = e.target.closest('[data-goto-company]');
    if (companyLink) {
      e.preventDefault();
      e.stopPropagation();
      navigateToCompanySearch({ name: companyLink.getAttribute('data-name') || '' });
      return;
    }
    const contactLink = e.target.closest('[data-goto-contact]');
    if (contactLink) {
      e.preventDefault();
      e.stopPropagation();
      navigateToContactSearch({
        company: contactLink.getAttribute('data-company') || '',
        name: contactLink.getAttribute('data-name') || '',
      });
      return;
    }
    const activityLink = e.target.closest('[data-goto-activity]');
    if (activityLink) {
      e.preventDefault();
      e.stopPropagation();
      navigateToActivitySearch({
        company: activityLink.getAttribute('data-company') || '',
        contact: activityLink.getAttribute('data-contact') || '',
        type: activityLink.getAttribute('data-type') || '',
      });
      return;
    }
    const projectLink = e.target.closest('[data-goto-project]');
    if (!projectLink) return;
    e.preventDefault();
    e.stopPropagation();
    navigateToProjectSearch({
      company: projectLink.getAttribute('data-company') || '',
      rep: projectLink.getAttribute('data-rep') || '',
      name: projectLink.getAttribute('data-name') || '',
    });
  });
}
