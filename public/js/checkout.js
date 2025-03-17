document.getElementById('checkout-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    const token = localStorage.getItem('token');
    if (!token) {
        alert('Вы не авторизованы. Пожалуйста, войдите в систему.');
        window.location.href = '/login.html';
        return;
    }

    try {
        const response = await fetch('/api/place-order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token
            },
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            throw new Error('Failed to place order');
        }
        const result = await response.json();
        const orderDate = new Date().toLocaleDateString();
        alert(`Заказ от ${orderDate} успешно создан`);
        window.location.href = '/profile.html';
    } catch (err) {
        console.error('[Client] Error placing order:', err);
        alert('Не удалось оформить заказ');
    }
});