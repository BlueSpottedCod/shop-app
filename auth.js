document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
});

async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const messageDiv = document.getElementById('message');
    
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            messageDiv.className = 'success';
            messageDiv.textContent = 'Вход выполнен успешно! Перенаправление...';
            
            setTimeout(() => {
                if (data.role === 'admin') {
                    window.location.href = '/admin.html';
                } else {
                    window.location.href = '/';
                }
            }, 1500);
        } else {
            messageDiv.className = 'error';
            messageDiv.textContent = data.error || 'Ошибка при входе';
        }
    } catch (error) {
        messageDiv.className = 'error';
        messageDiv.textContent = 'Ошибка соединения с сервером';
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const messageDiv = document.getElementById('message');
    
    if (password !== confirmPassword) {
        messageDiv.className = 'error';
        messageDiv.textContent = 'Пароли не совпадают';
        return;
    }
    
    if (password.length < 6) {
        messageDiv.className = 'error';
        messageDiv.textContent = 'Пароль должен содержать не менее 6 символов';
        return;
    }
    
    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, email, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            messageDiv.className = 'success';
            messageDiv.textContent = 'Регистрация успешна! Перенаправление на страницу входа...';
            
            setTimeout(() => {
                window.location.href = '/login.html';
            }, 2000);
        } else {
            messageDiv.className = 'error';
            messageDiv.textContent = data.error || 'Ошибка при регистрации';
        }
    } catch (error) {
        messageDiv.className = 'error';
        messageDiv.textContent = 'Ошибка соединения с сервером';
    }
}