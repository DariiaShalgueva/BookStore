// Функция для преобразования способа оплаты
function getPaymentMethodName(method) {
    switch(method) {
        case 'credit_card':
            return 'Кредитная карта';
        case 'paypal':
            return 'PayPal';
        case 'bank_transfer':
            return 'Банковский перевод';
        default:
            return method;
    }
}

// Функция для преобразования способа доставки
function getShippingMethodName(method) {
    switch(method) {
        case 'pickup':
            return 'Самовывоз';
        case 'courier':
            return 'Курьерская доставка';
        case 'postal':
            return 'Почтовая доставка';
        default:
            return method;
    }
}

async function loadProfile() {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('Вы не авторизованы. Пожалуйста, войдите в систему.');
        window.location.href = '/login.html';
        return;
    }

    try {
        // Загружаем информацию о пользователе
        const profileResponse = await fetch('/api/profile', {
            headers: {
                'Authorization': token
            }
        });
        if (!profileResponse.ok) {
            throw new Error('Unauthorized');
        }
        const user = await profileResponse.json();
        const profileInfo = document.getElementById('profile-info');
        profileInfo.innerHTML = `
            <h3>Информация о пользователе</h3>
            <p><strong>Имя пользователя:</strong> ${user.username}</p>
            <p><strong>Email:</strong> ${user.email}</p>
            <p><strong>Имя:</strong> ${user.first_name}</p>
            <p><strong>Фамилия:</strong> ${user.last_name}</p>
            <p><strong>Телефон:</strong> ${user.phone}</p>
            <p><strong>Адрес:</strong> ${user.address}</p>
        `;

        // Загружаем информацию о заказах
        const ordersResponse = await fetch('/api/orders', {
            headers: {
                'Authorization': token
            }
        });
        if (!ordersResponse.ok) {
            throw new Error('Failed to load orders');
        }
        const orders = await ordersResponse.json();
        const ordersInfo = document.getElementById('orders-list');
        if (orders.length === 0) {
            ordersInfo.innerHTML = '<p>Нет заказов</p>';
        } else {
            let ordersHTML = '';
            for (const order of orders) {
                // Загружаем детали заказа
                const orderDetailsResponse = await fetch(`/api/order-details?order_id=${order.order_id}`, {
                    headers: {
                        'Authorization': token
                    }
                });
                if (!orderDetailsResponse.ok) {
                    throw new Error('Failed to load order details');
                }
                const orderDetails = await orderDetailsResponse.json();

                ordersHTML += `
                    <div class="order-card">
                        <h3>Заказ от ${new Date(order.order_date).toLocaleDateString()}</h3>
                        <p><strong>Дата:</strong> ${new Date(order.order_date).toLocaleString()}</p>
                        <p><strong>Статус:</strong> ${order.status}</p>
                        <p><strong>Сумма:</strong> ${order.total_amount.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB' })} ₽</p>
                        <p><strong>Способ оплаты:</strong> ${getPaymentMethodName(order.payment_method)}</p>
                        <p><strong>Способ доставки:</strong> ${getShippingMethodName(order.shipping_method)}</p>
                        <h4>Купленные книги:</h4>
                        <ul>
                `;

                for (const item of orderDetails.order_items) {
                    ordersHTML += `<li>${item.title} (${item.quantity} шт.)</li>`;
                }

                ordersHTML += `
                        </ul>
                    </div>
                `;
            }
            ordersInfo.innerHTML = ordersHTML;
        }
    } catch (err) {
        console.error(err);
        alert('Не удалось загрузить профиль');
        window.location.href = '/login.html';
    }
}

window.onload = loadProfile;