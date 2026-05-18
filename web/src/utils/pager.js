/** Shared page-number buttons for .pager-standalone (CP01, CP05, …) */
export function renderPageNumberButtons(container, currentPage, totalPages, onSelect) {
  if (!container) return;
  container.innerHTML = '';
  if (totalPages < 1) return;

  const maxVisible = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let endPage = Math.min(totalPages, startPage + maxVisible - 1);
  if (endPage - startPage + 1 < maxVisible) {
    startPage = Math.max(1, endPage - maxVisible + 1);
  }

  if (startPage > 1) {
    const first = document.createElement('button');
    first.type = 'button';
    first.className = `pg-btn ${currentPage === 1 ? 'active' : ''}`;
    first.textContent = '1';
    first.onclick = () => onSelect(1);
    container.appendChild(first);
    if (startPage > 2) {
      const sep = document.createElement('span');
      sep.className = 'page-sep';
      sep.textContent = '…';
      container.appendChild(sep);
    }
  }

  for (let p = startPage; p <= endPage; p++) {
    if (startPage > 1 && p === 1) continue;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `pg-btn ${p === currentPage ? 'active' : ''}`;
    btn.textContent = String(p);
    btn.onclick = () => onSelect(p);
    container.appendChild(btn);
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      const sep = document.createElement('span');
      sep.className = 'page-sep';
      sep.textContent = '…';
      container.appendChild(sep);
    }
    const last = document.createElement('button');
    last.type = 'button';
    last.className = `pg-btn ${currentPage === totalPages ? 'active' : ''}`;
    last.textContent = String(totalPages);
    last.onclick = () => onSelect(totalPages);
    container.appendChild(last);
  }
}
