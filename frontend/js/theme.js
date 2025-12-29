// Theme management
(function() {
    const THEME_KEY = 'whisperflow_theme';
    const THEME_LIGHT = 'light';
    const THEME_DARK = 'dark';

    // Get current theme from localStorage or default to light
    function getCurrentTheme() {
        const saved = localStorage.getItem(THEME_KEY);
        return saved || THEME_LIGHT;
    }

    // Set theme
    function setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem(THEME_KEY, theme);
        updateThemeIcon(theme);
    }

    // Update theme icon
    function updateThemeIcon(theme) {
        const icon = document.getElementById('themeIcon');
        if (!icon) return;

        const moonPath = icon.querySelector('.theme-icon-moon');
        const sunElements = icon.querySelectorAll('.theme-icon-sun');

        if (theme === THEME_DARK) {
            // Show sun icon (to switch to light)
            if (moonPath) moonPath.style.display = 'none';
            sunElements.forEach(el => el.style.display = 'block');
        } else {
            // Show moon icon (to switch to dark)
            if (moonPath) moonPath.style.display = 'block';
            sunElements.forEach(el => el.style.display = 'none');
        }
    }

    // Toggle theme
    window.toggleTheme = function() {
        const current = getCurrentTheme();
        const newTheme = current === THEME_LIGHT ? THEME_DARK : THEME_LIGHT;
        setTheme(newTheme);
    };

    // Initialize theme on load
    document.addEventListener('DOMContentLoaded', function() {
        const theme = getCurrentTheme();
        setTheme(theme);
    });

    // Also initialize immediately if DOM is already loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            const theme = getCurrentTheme();
            setTheme(theme);
        });
    } else {
        const theme = getCurrentTheme();
        setTheme(theme);
    }
})();





