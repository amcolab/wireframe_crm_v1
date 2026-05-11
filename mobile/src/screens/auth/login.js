export function init() {
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            const username = document.getElementById('username').value;
            if (username) {
                localStorage.setItem('smos_auth', 'true');
                window.location.hash = 'home';
            } else {
                alert('ユーザーIDを入力してください');
            }
        });
    }
}
