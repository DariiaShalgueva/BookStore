let allBooks = [];

async function loadBooks() {
    try {
        const response = await fetch('/api/books');
        const data = await response.json();
        allBooks = data;
        displayBooks(allBooks);
    } catch (err) {
        console.error(err);
    }
}

function displayBooks(books) {
    const catalog = document.getElementById('catalog');
    catalog.innerHTML = '';
    books.forEach(book => {
        const card = document.createElement('div');
        card.className = 'book-card';
        card.innerHTML = `
            <a href="/book.html?id=${book.book_id}">
                <img src="${book.image_url || '/images/books/default.jpg'}" alt="${book.title}">
                <h3>${book.title}</h3>
                <p>${book.author}</p>
                <p>Цена: ${book.price} ₽</p>
            </a>
        `;
        catalog.appendChild(card);
    });
}

async function searchBooks() {
    const query = document.getElementById('search').value;
    if (!query) {
        loadBooks();
        return;
    }
    try {
        const response = await fetch(`/api/books/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        allBooks = data;
        displayBooks(allBooks);
    } catch (err) {
        console.error(err);
    }
}

async function sortBooks() {
    const sortValue = document.getElementById('sort').value;
    if (sortValue === 'default') {
        loadBooks();
        return;
    }
    try {
        const response = await fetch(`/api/books/sort?sort=${encodeURIComponent(sortValue)}`);
        const data = await response.json();
        allBooks = data;
        displayBooks(allBooks);
    } catch (err) {
        console.error(err);
    }
}

async function filterBooks() {
    const genre = document.getElementById('filter').value;
    if (genre === 'all') {
        loadBooks();
        return;
    }
    try {
        const response = await fetch(`/api/books/filter?genre=${encodeURIComponent(genre)}`);
        const data = await response.json();
        allBooks = data;
        displayBooks(allBooks);
    } catch (err) {
        console.error(err);
    }
}

async function resetFilters() {
    document.getElementById('search').value = '';
    document.getElementById('sort').value = 'default';
    document.getElementById('filter').value = 'all';
    loadBooks();
}

// public/js/scripts.js (обновление функции goToBook)
function goToBook(bookId) {
    window.location.href = `/book.html?id=${bookId}`;
}
// public/js/scripts.js (обновление функции addToCart)
function addToCart(bookId) {
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
        alert('Failed to add to cart');
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



loadBooks();