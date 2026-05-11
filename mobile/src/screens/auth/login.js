export function init() {
    const loginBtn = document.getElementById('login-btn');
    const nextBtn = document.getElementById('next-btn');
    const backBtn = document.getElementById('back-btn');
    const step1 = document.getElementById('login-step-1');
    const step2 = document.getElementById('login-step-2');
    const usernameInput = document.getElementById('username');
    const displayUsername = document.getElementById('display-username');

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            const user = usernameInput.value.trim();
            if (user) {
                displayUsername.textContent = user;
                step1.style.display = 'none';
                step2.style.display = 'flex';
            } else {
                alert('ユーザーIDを入力してください');
            }
        });
    }

    if (backBtn) {
        backBtn.addEventListener('click', () => {
            step2.style.display = 'none';
            step1.style.display = 'flex';
        });
    }

    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            const password = document.getElementById('password').value;
            if (password) {
                localStorage.setItem('smos_auth', 'true');
                window.location.hash = 'home';
            } else {
                alert('パスワードを入力してください');
            }
        });
    }
}
