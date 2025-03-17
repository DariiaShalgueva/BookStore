document.addEventListener('DOMContentLoaded', function() {
    const token = localStorage.getItem('token');
    const authLinks = document.getElementById('auth-links');

    if (token) {
        // Если пользователь авторизован, показываем "Выйти" и "Личный кабинет"
        authLinks.innerHTML = `
            <a href="/profile.html">Личный кабинет</a>
            <a href="#" onclick="logout()">Выйти</a>
        `;
    } else {
        // Если пользователь не авторизован, показываем "Войти"
        authLinks.innerHTML = `
            <a href="/login.html">Войти</a>
        `;
    }
});

function logout() {
    localStorage.removeItem('token');
    window.location.href = '/login.html';
}