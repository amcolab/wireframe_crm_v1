const PENDING_CONTACT_SEARCH_KEY = 'smos.pendingContactSearch';
const PENDING_ACTIVITY_SEARCH_KEY = 'smos.pendingActivitySearch';
const PENDING_PROJECT_SEARCH_KEY = 'smos.pendingProjectSearch';

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
