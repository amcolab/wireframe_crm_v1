import { q } from './helpers.js';

function closeShellMenus() {
  document.querySelector('.settings-menu-trigger')?.classList.remove('show-menu');
  q('userMenuTrigger')?.classList.remove('active');
}

function openDialog(id) {
  closeShellMenus();
  q(id)?.showModal();
}

/** Shell chrome: settings sidebar, user menu, shared menu → modal wiring */
export function initShellChrome() {
  const settingsTrigger = document.querySelector('.settings-menu-trigger');
  const userMenuTrigger = q('userMenuTrigger');
  const userDropdown = q('userMenuDropdown');
  const settingsDropdown = document.querySelector('.settings-dropdown');

  settingsTrigger?.addEventListener('click', (e) => {
    e.stopPropagation();
    settingsTrigger.classList.toggle('show-menu');
  });

  userMenuTrigger?.addEventListener('click', (e) => {
    e.stopPropagation();
    userMenuTrigger.classList.toggle('active');
  });

  document.addEventListener('click', () => {
    closeShellMenus();
  });

  if (settingsDropdown) {
    settingsDropdown.addEventListener('click', (e) => e.stopPropagation());
  }
  if (userDropdown) {
    userDropdown.addEventListener('click', (e) => e.stopPropagation());
  }

  q('userMenuPassword')?.addEventListener('click', (e) => {
    e.stopPropagation();
    openDialog('dlgPasswordChange');
  });

  q('userMenuSettings')?.addEventListener('click', (e) => {
    e.stopPropagation();
    closeShellMenus();
    settingsTrigger?.classList.add('show-menu');
  });

  q('userMenuLogout')?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeShellMenus();
    window.location.hash = 'access';
  });

  document.querySelector('.settings-dropdown .dropdown-item.logout')?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeShellMenus();
    window.location.hash = 'access';
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeShellMenus();
  });

  return { closeShellMenus, openDialog };
}
