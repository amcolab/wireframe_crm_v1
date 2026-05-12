export function init() {
    console.log('Scan Result screen initialized');
    
    const registerBtn = document.getElementById('btn-register-scan');
    if (registerBtn) {
        registerBtn.addEventListener('click', () => {
            alert('登録が完了しました');
            window.location.hash = 'home';
        });
    }
}
