// public/js/header.js
async function updateHeader() {
    const token = localStorage.getItem('token');
    const authLinks = document.getElementById('auth-links');
    if (token) {
        authLinks.innerHTML = `
            <a href="/profile.html">Личный кабинет</a>
            <a href="/api/logout" onclick="logout()">Выйти</a>
        `;
    } else {
        authLinks.innerHTML = `
            <a href="/login.html">Войти</a>
        `;
    }
}

function logout() {
    localStorage.removeItem('token');
    window.location.href = '/login.html';
}

window.onload = updateHeader;