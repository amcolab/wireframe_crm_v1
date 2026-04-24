document.addEventListener('DOMContentLoaded', () => {
    const accessCodeScreen = document.getElementById('access-code-screen');
    const loginScreen = document.getElementById('login-screen');
    const btnSubmitCode = document.getElementById('btn-submit-code');
    const btnLogin = document.getElementById('btn-login');
    const accessCodeInput = document.getElementById('access-code');

    // Handle Access Code submission
    btnSubmitCode.addEventListener('click', () => {
        const code = accessCodeInput.value;

        // Simple visual feedback before transition
        btnSubmitCode.textContent = 'Verifying...';
        btnSubmitCode.style.opacity = '0.7';
        btnSubmitCode.style.pointerEvents = 'none';

        setTimeout(() => {
            transitionToLogin();
        }, 800);
    });

    // Handle Enter key on access code input
    accessCodeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            btnSubmitCode.click();
        }
    });

    function transitionToLogin() {
        // Fade out current screen
        accessCodeScreen.classList.remove('active');

        setTimeout(() => {
            // After fade out, remove from flow if needed or just hide
            // Show new screen
            loginScreen.classList.add('active');

            // Focus first input of login screen
            document.getElementById('username').focus();
        }, 600);
    }

    // Handle Login submission
    btnLogin.addEventListener('click', () => {
        const username = document.getElementById('username').value;
        if (username) {
            btnLogin.textContent = 'Logging in...';
            btnLogin.style.opacity = '0.7';

            setTimeout(() => {
                transitionToDashboard();
            }, 800);
        } else {
            // Simple shake effect on error
            const card = loginScreen.querySelector('.window-card');
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
    });

    function transitionToDashboard() {
        loginScreen.classList.remove('active');
        const dashboard = document.getElementById('dashboard-container');

        setTimeout(() => {
            dashboard.classList.add('active');
            // Ensure first section is visible
            switchSection('company');
        }, 400);
    }

    // Sidebar Navigation logic
    const sidebarItems = document.querySelectorAll('.sidebar-item');
    const sections = document.querySelectorAll('.section');

    sidebarItems.forEach(item => {
        item.addEventListener('click', () => {
            const sectionId = item.getAttribute('data-section');
            switchSection(sectionId);
        });
    });

    function switchSection(sectionId) {
        // Update sidebar active state
        sidebarItems.forEach(i => {
            if (i.getAttribute('data-section') === sectionId) {
                i.classList.add('active');
            } else {
                i.classList.remove('active');
            }
        });

        // Update sections active state
        sections.forEach(s => {
            if (s.id === sectionId) {
                s.classList.add('active');
            } else {
                s.classList.remove('active');
            }
        });
    }
});
