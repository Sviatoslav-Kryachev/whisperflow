// Загрузка компонентов (header, footer)
async function loadComponent(id, url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.error(`Failed to load component ${url}`);
            return;
        }
        const html = await response.text();
        const element = document.getElementById(id);
        if (element) {
            element.innerHTML = html;
            
            // Обработка logout ссылки
            if (id === 'header') {
                const logoutLink = document.getElementById('logoutLink');
                if (logoutLink) {
                    logoutLink.addEventListener('click', (e) => {
                        e.preventDefault();
                        localStorage.removeItem('token');
                        window.location.href = 'login.html';
                    });
                }
            }
        }
    } catch (error) {
        console.error(`Error loading component ${url}:`, error);
    }
}

// Загружаем компоненты при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    loadComponent('header', 'components/header.html');
    loadComponent('footer', 'components/footer.html');
});
