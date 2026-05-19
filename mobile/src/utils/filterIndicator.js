import { getActiveChipFilter } from './chipFilter.js';

/**
 * Orange dot on filter btn — only when advanced fields or quick chip filter is active.
 */
export function syncFilterIndicator({ chipContainerId = null, fieldIds = [] } = {}) {
    const btn = document.querySelector('.filter-btn');
    if (!btn) return;

    const chipVal = chipContainerId ? getActiveChipFilter(chipContainerId) : '';
    const advActive = fieldIds.some((id) => {
        const el = document.getElementById(id);
        if (!el) return false;
        const v = (el.value ?? '').trim();
        if (el.type === 'checkbox') return el.checked;
        return v !== '';
    });

    btn.classList.toggle('has-filters', !!(chipVal || advActive));
}

export function bindFilterIndicator({ chipContainerId, fieldIds, onChange }) {
    const run = () => {
        syncFilterIndicator({ chipContainerId, fieldIds });
        onChange?.();
    };

    fieldIds.forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('input', run);
        el.addEventListener('change', run);
    });

    if (chipContainerId) {
        const chips = document.getElementById(chipContainerId);
        chips?.addEventListener('click', () => setTimeout(run, 0));
    }

    run();
    return run;
}
