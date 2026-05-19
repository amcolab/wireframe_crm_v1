/** Quick-filter chips below search bar (CRM filter-chips pattern) */
export function setupChipFilter(containerId, onFilterChange) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.addEventListener('click', (e) => {
        const chip = e.target.closest('.chip');
        if (!chip || !container.contains(chip)) return;

        container.querySelectorAll('.chip').forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
        onFilterChange(chip.dataset.filter ?? '');
    });
}

export function getActiveChipFilter(containerId) {
    const active = document.querySelector(`#${containerId} .chip.active`);
    return active?.dataset.filter ?? '';
}
