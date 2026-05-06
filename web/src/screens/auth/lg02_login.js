import { q } from '../../utils/helpers.js';

export function init() {
  const btnLogin = q('btn-login');
  const loginScreen = q('login-screen');

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
