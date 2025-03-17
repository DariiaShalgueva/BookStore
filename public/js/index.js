document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');

    try {
        // Загружаем данные о книгах
        const response = await fetch('/api/books');
        if (!response.ok) {
            throw new Error('Failed to load books');
        }
        const books = await response.json();

        // Отображаем популярные книги в слайдере
        const booksSlider = document.querySelector('.books-slider');
        books.slice(0, 5).forEach(book => {
            const bookCard = document.createElement('div');
            bookCard.className = 'book-card';
            bookCard.innerHTML = `
                <img src="${book.image_url || '/images/books/default.jpg'}" alt="${book.title}">
                <h3>${book.title}</h3>
                <p>${book.author}</p>
                <p>${book.price} ₽</p>
                <a href="/book.html?id=${book.book_id}">Подробнее</a>
            `;
            booksSlider.appendChild(bookCard);
        });

        // Отображаем рекомендуемые книги в сетке
        const booksGrid = document.querySelector('.books-grid');
        books.slice(5, 15).forEach(book => {
            const bookCard = document.createElement('div');
            bookCard.className = 'book-card';
            bookCard.innerHTML = `
                <img src="${book.image_url || '/images/books/default.jpg'}" alt="${book.title}">
                <h3>${book.title}</h3>
                <p>${book.author}</p>
                <p>${book.price} ₽</p>
                <a href="/book.html?id=${book.book_id}">Подробнее</a>
            `;
            booksGrid.appendChild(bookCard);
        });
    } catch (err) {
        console.error(err);
    }
});