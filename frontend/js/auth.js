// Элементы формы входа
const loginBtn = document.getElementById("loginBtn");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const loginMessage = document.getElementById("loginMessage");
const loginForm = document.getElementById("loginForm");

// Элементы формы регистрации
const registerBtn = document.getElementById("registerBtn");
const registerEmail = document.getElementById("registerEmail");
const registerPassword = document.getElementById("registerPassword");
const registerPasswordConfirm = document.getElementById("registerPasswordConfirm");
const registerMessage = document.getElementById("registerMessage");
const registerForm = document.getElementById("registerForm");

// Элементы формы восстановления пароля
const forgotPasswordBtn = document.getElementById("forgotPasswordBtn");
const forgotEmail = document.getElementById("forgotEmail");
const forgotPasswordMessage = document.getElementById("forgotPasswordMessage");
const forgotPasswordForm = document.getElementById("forgotPasswordForm");

// Переключение между формами
document.getElementById("showRegisterLink")?.addEventListener("click", (e) => {
    e.preventDefault();
    showForm("register");
});

document.getElementById("showLoginLink")?.addEventListener("click", (e) => {
    e.preventDefault();
    showForm("login");
});

document.getElementById("forgotPasswordLink")?.addEventListener("click", (e) => {
    e.preventDefault();
    showForm("forgot");
});

document.getElementById("backToLoginLink")?.addEventListener("click", (e) => {
    e.preventDefault();
    showForm("login");
});

function showForm(formName) {
    // Скрываем все формы
    loginForm.classList.remove("active");
    registerForm.classList.remove("active");
    forgotPasswordForm.classList.remove("active");
    
    // Показываем нужную форму
    if (formName === "login") {
        loginForm.classList.add("active");
    } else if (formName === "register") {
        registerForm.classList.add("active");
    } else if (formName === "forgot") {
        forgotPasswordForm.classList.add("active");
    }
    
    // Очищаем сообщения
    clearMessages();
}

function clearMessages() {
    loginMessage.textContent = "";
    loginMessage.className = "message";
    registerMessage.textContent = "";
    registerMessage.className = "message";
    forgotPasswordMessage.textContent = "";
    forgotPasswordMessage.className = "message";
}

function showMessage(element, text, type) {
    element.textContent = text;
    element.className = `message ${type}`;
}

// Вход
loginBtn?.addEventListener("click", async () => {
    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (!username || !password) {
        showMessage(loginMessage, "Введите email и пароль", "error");
        return;
    }

    try {
        loginBtn.disabled = true;
        loginBtn.textContent = "Вход...";
        
        const response = await fetch(`${window.location.origin}/auth/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ username, password })
        });

        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
            } catch {
                errorData = { detail: `HTTP ${response.status}: ${response.statusText}` };
            }
            showMessage(loginMessage, errorData.detail || "Неверный email или пароль", "error");
            return;
        }

        const data = await response.json();
        localStorage.setItem("token", data.access_token);
        showMessage(loginMessage, "Успешный вход! Перенаправление...", "success");
        
        setTimeout(() => {
            window.location.href = "dashboard.html";
        }, 1000);

    } catch (err) {
        let errorMsg = err.message;
        if (err instanceof TypeError && err.message.includes('fetch')) {
            errorMsg = "Ошибка подключения к серверу. Убедитесь, что сервер запущен.";
        }
        showMessage(loginMessage, "Ошибка подключения: " + errorMsg, "error");
    } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = "Войти";
    }
});

// Регистрация
registerBtn?.addEventListener("click", async () => {
    const email = registerEmail.value.trim();
    const password = registerPassword.value;
    const passwordConfirm = registerPasswordConfirm.value;

    if (!email || !password || !passwordConfirm) {
        showMessage(registerMessage, "Заполните все поля", "error");
        return;
    }

    if (password !== passwordConfirm) {
        showMessage(registerMessage, "Пароли не совпадают", "error");
        return;
    }

    if (password.length < 6) {
        showMessage(registerMessage, "Пароль должен быть не менее 6 символов", "error");
        return;
    }

    try {
        registerBtn.disabled = true;
        registerBtn.textContent = "Регистрация...";
        
        const response = await fetch(`${window.location.origin}/auth/register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email, password })
        });

        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
            } catch {
                errorData = { detail: `HTTP ${response.status}: ${response.statusText}` };
            }
            showMessage(registerMessage, errorData.detail || "Ошибка регистрации", "error");
            return;
        }

        const data = await response.json();
        localStorage.setItem("token", data.access_token);
        showMessage(registerMessage, "Регистрация успешна! Перенаправление...", "success");
        
        setTimeout(() => {
            window.location.href = "dashboard.html";
        }, 1000);

    } catch (err) {
        let errorMsg = err.message;
        if (err instanceof TypeError && err.message.includes('fetch')) {
            errorMsg = "Ошибка подключения к серверу. Убедитесь, что сервер запущен.";
        }
        showMessage(registerMessage, "Ошибка подключения: " + errorMsg, "error");
    } finally {
        registerBtn.disabled = false;
        registerBtn.textContent = "Зарегистрироваться";
    }
});

// Восстановление пароля
forgotPasswordBtn?.addEventListener("click", async () => {
    const email = forgotEmail.value.trim();

    if (!email) {
        showMessage(forgotPasswordMessage, "Введите email", "error");
        return;
    }

    try {
        forgotPasswordBtn.disabled = true;
        forgotPasswordBtn.textContent = "Отправка...";
        
        const response = await fetch(`${window.location.origin}/auth/forgot-password`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email })
        });

        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
            } catch {
                errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
            }
            showMessage(forgotPasswordMessage, errorData.message || errorData.detail || "Ошибка отправки", "error");
            return;
        }

        const data = await response.json();
        showMessage(forgotPasswordMessage, data.message || "Инструкции отправлены на ваш email", "success");

    } catch (err) {
        let errorMsg = err.message;
        if (err instanceof TypeError && err.message.includes('fetch')) {
            errorMsg = "Ошибка подключения к серверу. Убедитесь, что сервер запущен.";
        }
        showMessage(forgotPasswordMessage, "Ошибка подключения: " + errorMsg, "error");
    } finally {
        forgotPasswordBtn.disabled = false;
        forgotPasswordBtn.textContent = "Отправить";
    }
});

// Поддержка Enter для отправки форм
[usernameInput, passwordInput].forEach(input => {
    input?.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            loginBtn?.click();
        }
    });
});

[registerEmail, registerPassword, registerPasswordConfirm].forEach(input => {
    input?.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            registerBtn?.click();
        }
    });
});

forgotEmail?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        forgotPasswordBtn?.click();
    }
});
