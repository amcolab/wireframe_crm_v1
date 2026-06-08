import { q, escapeHtml } from './helpers.js';

export const ATTACH_EMPTY_TEXT = 'ここにドラッグ&ドロップ';

/**
 * @param {string} attachListId
 */
export function bindAttachField(attachListId) {
  const attachList = q(attachListId);
  if (!attachList || attachList.dataset.bound === '1') return;
  attachList.dataset.bound = '1';

  const attachField = attachList.closest('.attach-field');
  const addBtn = attachField?.querySelector('.dropzone.compact');
  const countEl = attachField?.querySelector('.attach-count');

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.multiple = true;
  fileInput.style.display = 'none';
  attachField?.appendChild(fileInput);

  const formatBytes = (bytes) => {
    if (!Number.isFinite(bytes) || bytes < 1024) return `${bytes || 0} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  const fileExt = (name) => {
    const ext = String(name || '').split('.').pop()?.toLowerCase() || '';
    if (!ext) return { icon: 'FILE', cls: 'other', label: 'ファイル' };
    if (ext === 'pdf') return { icon: 'PDF', cls: 'pdf', label: 'PDFファイル' };
    if (['xls', 'xlsx', 'csv'].includes(ext)) return { icon: 'XLS', cls: 'xls', label: 'Excelファイル' };
    if (['doc', 'docx', 'txt', 'rtf'].includes(ext)) return { icon: 'DOC', cls: 'doc', label: '文書ファイル' };
    if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return { icon: 'IMG', cls: 'img', label: '画像ファイル' };
    return { icon: ext.slice(0, 3).toUpperCase(), cls: 'other', label: 'ファイル' };
  };

  const today = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}/${m}/${d}`;
  };

  const updateAttachUiState = () => {
    const items = attachList.querySelectorAll('.attach-item');
    if (countEl) countEl.textContent = `(${items.length}件)`;

    const empty = attachList.querySelector('.attach-empty');
    if (!items.length) {
      if (!empty) {
        const el = document.createElement('div');
        el.className = 'attach-empty';
        el.textContent = ATTACH_EMPTY_TEXT;
        el.style.height = '85px';
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
        el.style.color = 'var(--text-3)';
        el.style.textAlign = 'center';
        attachList.appendChild(el);
      }
      return;
    }
    empty?.remove();
  };

  const appendAttachItem = (fileName, sizeLabel, dateLabel, authorLabel = 'admin') => {
    const info = fileExt(fileName);
    const item = document.createElement('div');
    item.className = 'attach-item';
    item.innerHTML = `
      <div class="attach-icon ${escapeHtml(info.cls)}" title="${escapeHtml(info.label)}">${escapeHtml(info.icon)}</div>
      <div class="attach-name">
        <a class="n" href="#" download="${escapeHtml(fileName)}" title="${escapeHtml(fileName)}">${escapeHtml(fileName)}</a>
        <span class="meta">${escapeHtml(sizeLabel)} · ${escapeHtml(dateLabel)} · ${escapeHtml(authorLabel)}</span>
      </div>
      <div class="attach-actions">
        <button class="icon-btn" type="button" title="ダウンロード">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>
        </button>
        <button class="icon-btn danger" type="button" title="削除">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="m6 6 1 14h10l1-14"/></svg>
        </button>
      </div>
    `;
    attachList.appendChild(item);
    updateAttachUiState();
  };

  const triggerDownload = (attachItem) => {
    const link = attachItem?.querySelector('.attach-name .n');
    if (!(link instanceof HTMLAnchorElement)) return;

    const fileName = link.getAttribute('download') || link.textContent?.trim() || 'download.txt';
    const blob = new Blob([`Mock file content for ${fileName}`], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const processFiles = (files) => {
    const picked = Array.from(files || []);
    if (!picked.length) return;
    picked.forEach((file) => {
      appendAttachItem(file.name, formatBytes(file.size), today(), 'admin');
    });
  };

  attachList.addEventListener('click', (e) => {
    const target = e.target;
    if (!(target instanceof Element)) return;

    const attachItem = target.closest('.attach-item');
    if (!attachItem) return;

    const deleteBtn = target.closest('.icon-btn.danger[title="削除"]');
    if (deleteBtn) {
      attachItem.remove();
      updateAttachUiState();
      return;
    }

    const downloadBtn = target.closest('.icon-btn[title="ダウンロード"]');
    const fileLink = target.closest('.attach-name .n');
    if (downloadBtn || fileLink) {
      e.preventDefault();
      triggerDownload(attachItem);
    }
  });

  addBtn?.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    processFiles(fileInput.files);
    fileInput.value = '';
  });

  const setDropActive = (active) => {
    attachList.classList.toggle('drag-over', active);
    addBtn?.classList.toggle('drag-over', active);
  };
  ['dragenter', 'dragover'].forEach((eventName) => {
    attachList.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      setDropActive(true);
    });
  });
  ['dragleave', 'dragend'].forEach((eventName) => {
    attachList.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      const related = e.relatedTarget;
      if (related && attachList.contains(related)) return;
      setDropActive(false);
    });
  });
  attachList.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDropActive(false);
    processFiles(e.dataTransfer?.files || []);
  });

  updateAttachUiState();
}

/**
 * @param {string[]} attachListIds
 */
export function bindAttachFields(attachListIds) {
  attachListIds.forEach(bindAttachField);
}
