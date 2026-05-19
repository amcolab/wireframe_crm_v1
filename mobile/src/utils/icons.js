/** Inline SVG icons — synced with 会社_mobile_hifi.html (stroke, no Lucide) */

const S = (paths, sw = '2') =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

export const ICONS = {
    search: S('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
    filter: S('<path d="M3 6h18M6 12h12M10 18h4"/>'),
    refresh: S('<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>', '1.8'),
    chevronLeft: S('<path d="m15 6-6 6 6 6"/>', '2'),
    chevronRight: S('<path d="m9 6 6 6-6 6"/>', '2.4'),
    phone: S('<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L7.9 9.7a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2Z"/>'),
    close: S('<path d="M18 6 6 18M6 6l12 12"/>', '2'),
    company: S('<path d="M4 21V8l8-5 8 5v13"/><path d="M9 21v-7h6v7"/>', '1.8'),
    contact: S('<circle cx="12" cy="8" r="3.6"/><path d="M5 20c1-3.5 4-5.5 7-5.5s6 2 7 5.5"/>', '1.8'),
    home: S('<path d="M3 11 12 3l9 8"/><path d="M5 10v10h14V10"/>', '1.8'),
    activity: S('<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V4h8v3"/>', '1.8'),
    project: S('<path d="m6 12 3-3 3 3 6-6"/><path d="M21 21H3V3"/>', '1.8'),
    calendar: S('<path d="M12 8v4l3 2"/><circle cx="12" cy="12" r="9"/>', '2'),
    clock: S('<path d="M12 8v4l3 2"/><circle cx="12" cy="12" r="9"/>', '2'),
    mail: S('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>', '2'),
    camera: S('<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>', '1.8'),
    check: S('<path d="M5 12l5 5L20 7"/>', '2.4'),
    logout: S('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>', '1.8')
};

export function icon(name) {
    return ICONS[name] || '';
}
