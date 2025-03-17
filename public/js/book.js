async function loadBook() {
    const urlParams = new URLSearchParams(window.location.search);
    const bookId = urlParams.get('id');
    if (!bookId) {
        // Handle error
        return;
    }
    try {
        const response = await fetch(`/api/book?id=${encodeURIComponent(bookId)}`);
        if (!response.ok) {
            throw new Error('Book not found');
        }
        const book = await response.json();
        document.getElementById('book-cover').src = book.image_url || '/images/books/default.jpg';
        document.getElementById('book-title').textContent = book.title;
        document.getElementById('book-author').textContent = book.author;
        document.getElementById('book-price').textContent = book.price;
        document.getElementById('book-description').textContent = book.description;
        document.getElementById('add-to-cart-button').dataset.bookId = book.book_id;
    } catch (err) {
        console.error(err);
        alert('Книга не найдена');
        window.location.href = '/catalog';
    }
}

function addToCart() {
    const bookId = document.getElementById('add-to-cart-button').dataset.bookId;
    if (!bookId) {
        alert('Не удалось получить ID книги');
        return;
    }
    const token = localStorage.getItem('token');
    if (!token) {
        alert('Вы не авторизованы. Пожалуйста, войдите в систему.');
        window.location.href = '/login.html';
        return;
    }
    console.log(`[Client] Adding book with ID ${bookId} to cart`);
    fetch('/api/cart', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders()
        },
        body: JSON.stringify({ bookId: bookId, userId: getUserId() })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to add to cart');
        }
        return response.text();
    })
    .then(data => {
        console.log('[Client] Book added to cart successfully');
        alert('Книга добавлена в корзину');
    })
    .catch(err => {
        console.error('[Client] Error adding book to cart:', err);
        alert('Не удалось добавить книгу в корзину');
    });
}

function getUserId() {
    // Получаем userId из токена (это упрощенная реализация)
    const token = localStorage.getItem('token');
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.userId;
}

function getAuthHeaders() {
    const token = localStorage.getItem('token');
    if (!token) return {};
    return {
        'Authorization': token
    };
}

window.onload = loadBook;