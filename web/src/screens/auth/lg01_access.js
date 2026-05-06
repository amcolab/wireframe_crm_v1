import { q } from '../../utils/helpers.js';

export function init() {
  const btnSubmitCode = q('btn-submit-code');
  const accessCodeInput = q('access-code');

  if (!btnSubmitCode) return;

  btnSubmitCode.addEventListener('click', () => {
    // Simple visual feedback before transition
    btnSubmitCode.textContent = 'Verifying...';
    btnSubmitCode.style.opacity = '0.7';
    btnSubmitCode.style.pointerEvents = 'none';

    setTimeout(() => {
      if (window.appRouter) {
        window.appRouter.navigate('login');
      } else {
        window.location.hash = 'login';
      }
    }, 800);
  });

  // Handle Enter key on access code input
  accessCodeInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      btnSubmitCode.click();
    }
  });
}
