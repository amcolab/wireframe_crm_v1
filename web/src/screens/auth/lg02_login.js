import { q } from '../../utils/helpers.js';

const EYE_ON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M1.5 12s4-7.5 10.5-7.5S22.5 12 22.5 12s-4 7.5-10.5 7.5S1.5 12 1.5 12Z"/><circle cx="12" cy="12" r="3"/></svg>';
const EYE_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M1.5 12s4-7.5 10.5-7.5c2 0 3.7.45 5.1 1.1"/><path d="M22.5 12s-1.55 2.9-4.6 5"/><path d="m6.5 6.5 11 11"/><path d="M14.1 14.1A3 3 0 0 1 9.9 9.9"/></svg>';

export function init() {
  const btnLogin = q('btn-login');
  const loginScreen = q('login-screen');
  const togglePw = q('togglePw');
  const passwordInput = q('password');

  togglePw?.addEventListener('click', () => {
    if (!passwordInput) return;
    const show = passwordInput.type === 'password';
    passwordInput.type = show ? 'text' : 'password';
    togglePw.innerHTML = show ? EYE_OFF : EYE_ON;
    const label = show ? 'パスワードを非表示' : 'パスワードを表示';
    togglePw.setAttribute('aria-label', label);
    togglePw.setAttribute('title', label);
  });

  if (!btnLogin) return;

  btnLogin.addEventListener('click', () => {
    const username = q('username')?.value;
    if (username) {
      btnLogin.textContent = 'Logging in...';
      btnLogin.style.opacity = '0.7';

      setTimeout(() => {
        if (window.appRouter) {
          window.appRouter.navigate('company');
        } else {
          window.location.hash = 'company';
        }
      }, 800);
    } else {
      // Simple shake effect on error
      const card = loginScreen?.querySelector('.window-card');
      if (card) {
        card.animate([
          { transform: 'translateX(0)' },
          { transform: 'translateX(-10px)' },
          { transform: 'translateX(10px)' },
          { transform: 'translateX(-10px)' },
          { transform: 'translateX(10px)' },
          { transform: 'translateX(0)' }
        ], {
          duration: 400,
          easing: 'ease-in-out'
        });
      }
    }
  });

  // Focus username input
  q('username')?.focus();
}
