async function loadCart() {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('You are not authorized');
        window.location.href = '/login.html';
        return;
    }

    try {
        const response = await fetch('/api/cart', {
            headers: {
                'Authorization': token
            }
        });
        if (!response.ok) {
            throw new Error('Failed to load cart');
        }
        const books = await response.json();
        const cartItems = document.getElementById('cart-items');
        let total = 0;
        if (books.length === 0) {
            cartItems.innerHTML = '<p>Корзина пуста</p>';
            return;
        }
        books.forEach(book => {
            const item = document.createElement('div');
            item.className = 'cart-item';
            item.innerHTML = `
                <img src="${book.image_url || '/images/books/default.jpg'}" alt="${book.title}">
                <div class="cart-item-details">
                    <h3>${book.title}</h3>
                    <p>Цена: ${book.price} ₽</p>
                    <p>Количество: ${book.quantity}</p>
                </div>
            `;
            cartItems.appendChild(item);
            total += book.price * book.quantity;
        });
        document.getElementById('total-amount').textContent = total;
    } catch (err) {
        console.error(err);
        alert('Failed to load cart');
        window.location.href = '/login.html';
    }
}

function checkout() {
    window.location.href = '/checkout.html';
}

window.onload = loadCart;