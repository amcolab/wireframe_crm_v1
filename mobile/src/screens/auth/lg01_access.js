export function init() {
    const btnSubmitCode = document.getElementById('btn-submit-code');
    const accessCodeInput = document.getElementById('access-code');

    if (btnSubmitCode) {
        btnSubmitCode.addEventListener('click', () => {
            const code = accessCodeInput.value.trim();
            if (code) {
                // Visual feedback
                btnSubmitCode.innerHTML = '<span class="loader"></span>';
                btnSubmitCode.style.pointerEvents = 'none';

                setTimeout(() => {
                    window.location.hash = 'login';
                }, 800);
            } else {
                alert('承認コードを入力してください');
            }
        });
    }

    accessCodeInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            btnSubmitCode.click();
        }
    });
}
