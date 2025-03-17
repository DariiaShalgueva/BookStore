document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            throw new Error('Login failed');
        }
        const result = await response.json();
        localStorage.setItem('token', result.token);
        alert('Login successful');
        window.location.href = '/profile.html';
    } catch (err) {
        console.error(err);
        alert('Login failed');
    }
});