export function init() {
    const loginBtn = document.getElementById('btn-login');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');

    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            const user = usernameInput.value.trim();
            const pass = passwordInput.value.trim();

            if (user && pass) {
                // Visual feedback
                loginBtn.innerHTML = '<span class="loader"></span>';
                loginBtn.style.pointerEvents = 'none';

                setTimeout(() => {
                    localStorage.setItem('smos_auth', 'true');
                    window.location.hash = 'home';
                }, 1000);
            } else {
                alert('ログイン名とパスワードを入力してください');
            }
        });
    }

    const inputs = [usernameInput, passwordInput];
    inputs.forEach(input => {
        input?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                loginBtn.click();
            }
        });
    });
}
