const PENDING_CONTACT_SEARCH_KEY = 'smos.pendingContactSearch';

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
