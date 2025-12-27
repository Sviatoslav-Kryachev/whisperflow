// Загрузка компонентов (header, footer)
async function loadComponent(id, url) {
    try {
        console.log(`Loading component: ${id} from ${url}`);
        const response = await fetch(url);
        if (!response.ok) {
            console.error(`Failed to load component ${url}: ${response.status} ${response.statusText}`);
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
            console.log(`Component ${id} loaded successfully`);
        } else {
            console.warn(`Element with id "${id}" not found`);
        }
    } catch (error) {
        console.error(`Error loading component ${url}:`, error);
    }
}

// Загружаем компоненты при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    console.log('Loading components...');
    loadComponent('header', 'components/header.html').then(() => {
        console.log('Header loaded');
    }).catch(err => {
        console.error('Error loading header:', err);
    });
    loadComponent('footer', 'components/footer.html').then(() => {
        console.log('Footer loaded');
    }).catch(err => {
        console.error('Error loading footer:', err);
    });
});
