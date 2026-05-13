export function init() {
    console.log('Home initialized');
    const logoutTile = document.getElementById('logout-tile');
    if (logoutTile) {
        logoutTile.addEventListener('click', () => {
            if(confirm('ログアウトしますか？')) {
                localStorage.removeItem('smos_auth');
                window.location.hash = 'login';
            }
        });
    }
}
