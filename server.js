require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 3000;
// Настройка подключения к базе данных

const pool = new Pool({
    user: 'postgres',
    password: 'postgres',
    host: 'localhost',
    port: '5432',
    database: 'bookstore',
});


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'views')));



// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});


app.get('/catalog', async (req, res) => {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT books.book_id, books.title, books.description, books.price, authors.first_last_name AS author, book_images.image_url FROM books LEFT JOIN authors ON books.author_id = authors.author_id LEFT JOIN book_images ON books.book_id = book_images.book_id AND book_images.is_main = TRUE;');
        const books = result.rows;
        client.release();
        res.sendFile(path.join(__dirname, 'views', 'catalog.html'));
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// Маршрут для страницы книги
app.get('/book.html', async (req, res) => {
    const bookId = req.query.id;
    if (!bookId) {
        return res.status(400).send('Missing book ID');
    }
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT books.book_id, books.title, books.description, books.price, authors.first_last_name AS author, book_images.image_url FROM books LEFT JOIN authors ON books.author_id = authors.author_id LEFT JOIN book_images ON books.book_id = book_images.book_id AND book_images.is_main = TRUE WHERE books.book_id = \$1', [bookId]);
        const book = result.rows[0];
        client.release();
        if (!book) {
            return res.status(404).send('Book not found');
        }
        res.sendFile(path.join(__dirname, 'views', 'book.html'));
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// API endpoint для получения данных о книгах
app.get('/api/books', async (req, res) => {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT books.book_id, books.title, books.description, books.price, authors.first_last_name AS author, book_images.image_url FROM books LEFT JOIN authors ON books.author_id = authors.author_id LEFT JOIN book_images ON books.book_id = book_images.book_id AND book_images.is_main = TRUE;');
        const books = result.rows;
        client.release();
        res.json(books);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// API endpoint для получения данных о книге
app.get('/api/book', async (req, res) => {
    const bookId = req.query.id;
    if (!bookId) {
        return res.status(400).send('Missing book ID');
    }
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT books.book_id, books.title, books.description, books.price, authors.first_last_name AS author, book_images.image_url FROM books LEFT JOIN authors ON books.author_id = authors.author_id LEFT JOIN book_images ON books.book_id = book_images.book_id AND book_images.is_main = TRUE WHERE books.book_id = \$1', [bookId]);
        const book = result.rows[0];
        client.release();
        if (!book) {
            return res.status(404).send('Book not found');
        }
        res.json(book);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// server.js (обновленный маршрут /api/cart с логированием)
app.post('/api/cart', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { bookId } = req.body;
    console.log(`[API /api/cart] Received request with userId: ${userId}, bookId: ${bookId}`);

    if (!bookId) {
        console.error('[API /api/cart] Missing bookId in request');
        return res.status(400).send('Missing bookId');
    }

    try {
        const client = await pool.connect();
        console.log('[API /api/cart] Connected to the database');

        // Получаем корзину пользователя
        const cartResult = await client.query('SELECT cart_id FROM cart WHERE user_id = \$1', [userId]);
        console.log('[API /api/cart] Fetched cart ID');

        let cartId;
        if (cartResult.rows.length === 0) {
            // Создаем новую корзину
            const insertCartResult = await client.query('INSERT INTO cart (user_id) VALUES (\$1) RETURNING cart_id', [userId]);
            cartId = insertCartResult.rows[0].cart_id;
            console.log(`[API /api/cart] Created new cart with ID: ${cartId}`);
        } else {
            cartId = cartResult.rows[0].cart_id;
            console.log(`[API /api/cart] Retrieved cart ID: ${cartId}`);
        }

        // Проверяем, есть ли уже такая книга в корзине
        const itemResult = await client.query('SELECT * FROM cart_items WHERE cart_id = \$1 AND book_id = \$2', [cartId, bookId]);
        console.log('[API /api/cart] Checked if book is in cart');

        if (itemResult.rows.length > 0) {
            // Обновляем количество, если книга уже в корзине
            await client.query('UPDATE cart_items SET quantity = quantity + 1 WHERE cart_id = \$1 AND book_id = \$2', [cartId, bookId]);
            console.log('[API /api/cart] Updated quantity of book in cart');
        } else {
            // Добавляем новую книгу в корзину
            await client.query('INSERT INTO cart_items (cart_id, book_id, quantity) VALUES (\$1, \$2, \$3)', [cartId, bookId, 1]);
            console.log('[API /api/cart] Added new book to cart');
        }

        await client.release();
        console.log('[API /api/cart] Book added to cart successfully');
        res.send('Book added to cart');
    } catch (err) {
        console.error('[API /api/cart] Error:', err);
        res.status(500).send('Server error');
    }
});

// API endpoint для поиска книг
app.get('/api/books/search', async (req, res) => {
    const query = req.query.q;
    if (!query) {
        return res.status(400).send('Missing search query');
    }
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT books.book_id, books.title, books.description, books.price, authors.first_last_name AS author, book_images.image_url FROM books LEFT JOIN authors ON books.author_id = authors.author_id LEFT JOIN book_images ON books.book_id = book_images.book_id AND book_images.is_main = TRUE WHERE LOWER(books.title) LIKE LOWER(\$1) OR LOWER(authors.first_last_name) LIKE LOWER(\$1)', [`%${query}%`]);
        const books = result.rows;
        client.release();
        res.json(books);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// API endpoint для сортировки книг
app.get('/api/books/sort', async (req, res) => {
    const sortBy = req.query.sort;
    if (!sortBy) {
        return res.status(400).send('Missing sort parameter');
    }
    try {
        let order = 'ASC';
        if (sortBy === 'price-desc') {
            order = 'DESC';
        }
        const client = await pool.connect();
        const result = await client.query(`SELECT books.book_id, books.title, books.description, books.price, authors.first_last_name AS author, book_images.image_url FROM books LEFT JOIN authors ON books.author_id = authors.author_id LEFT JOIN book_images ON books.book_id = book_images.book_id AND book_images.is_main = TRUE ORDER BY price ${order};`);
        const books = result.rows;
        client.release();
        res.json(books);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// API endpoint для фильтрации книг по жанрам
app.get('/api/books/filter', async (req, res) => {
    const genre = req.query.genre;
    if (!genre) {
        return res.status(400).send('Missing genre parameter');
    }
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT books.book_id, books.title, books.description, books.price, authors.first_last_name AS author, book_images.image_url FROM books LEFT JOIN authors ON books.author_id = authors.author_id LEFT JOIN book_images ON books.book_id = book_images.book_id AND book_images.is_main = TRUE LEFT JOIN book_genres ON books.book_id = book_genres.book_id LEFT JOIN genres ON book_genres.genre_id = genres.genre_id WHERE genres.name = \$1;', [genre]);
        const books = result.rows;
        client.release();
        res.json(books);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});


app.post('/api/checkout', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    try {
        const client = await pool.connect();

        // Начинаем транзакцию
        await client.query('BEGIN');

        // Получаем корзину пользователя
        const cartResult = await client.query('SELECT cart_id FROM cart WHERE user_id = \$1', [userId]);
        if (cartResult.rows.length === 0) {
            await client.query('ROLLBACK');
            client.release();
            return res.status(400).send('Cart not found');
        }
        const cartId = cartResult.rows[0].cart_id;

        // Получаем элементы корзины
        const itemsResult = await client.query('SELECT book_id, quantity FROM cart_items WHERE cart_id = \$1', [cartId]);
        const items = itemsResult.rows;

        if (items.length === 0) {
            await client.query('ROLLBACK');
            client.release();
            return res.status(400).send('Cart is empty');
        }

        // Рассчитываем общую сумму
        let totalAmount = 0;
        for (const item of items) {
            const bookResult = await client.query('SELECT price FROM books WHERE book_id = \$1', [item.book_id]);
            if (bookResult.rows.length === 0) {
                await client.query('ROLLBACK');
                client.release();
                return res.status(400).send('Book not found');
            }
            totalAmount += bookResult.rows[0].price * item.quantity;
        }

        // Создаем заказ
        const orderResult = await client.query('INSERT INTO orders (user_id, total_amount) VALUES (\$1, \$2) RETURNING order_id', [userId, totalAmount]);
        const orderId = orderResult.rows[0].order_id;

        // Добавляем элементы заказа
        for (const item of items) {
            const bookResult = await client.query('SELECT price FROM books WHERE book_id = \$1', [item.book_id]);
            const unitPrice = bookResult.rows[0].price;
            await client.query('INSERT INTO order_items (order_id, book_id, quantity, unit_price, total_price) VALUES (\$1, \$2, \$3, \$4, \$5)', [orderId, item.book_id, item.quantity, unitPrice, unitPrice * item.quantity]);
        }

        // Очищаем корзину
        await client.query('DELETE FROM cart_items WHERE cart_id = \$1', [cartId]);

        // Фиксируем транзакцию
        await client.query('COMMIT');

        client.release();


        res.json({ orderId });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

app.post('/api/place-order', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { shipping_method, payment_method, address } = req.body;
    console.log(`[API /api/place-order] Received request with userId: ${userId}, shipping_method: ${shipping_method}, payment_method: ${payment_method}, address: ${address}`);

    if (!shipping_method || !payment_method) {
        console.error('[API /api/place-order] Missing shipping_method or payment_method in request');
        return res.status(400).send('Missing shipping_method or payment_method');
    }

    try {
        const client = await pool.connect();
        console.log('[API /api/place-order] Connected to the database');

        // Начинаем транзакцию
        await client.query('BEGIN');

        // Получаем корзину пользователя
        const cartResult = await client.query('SELECT cart_id FROM cart WHERE user_id = \$1', [userId]);
        if (cartResult.rows.length === 0) {
            await client.query('ROLLBACK');
            client.release();
            console.error('[API /api/place-order] Cart not found for user');
            return res.status(400).send('Cart not found');
        }
        const cartId = cartResult.rows[0].cart_id;

        // Получаем элементы корзины
        const itemsResult = await client.query('SELECT book_id, quantity FROM cart_items WHERE cart_id = \$1', [cartId]);
        const items = itemsResult.rows;

        if (items.length === 0) {
            await client.query('ROLLBACK');
            client.release();
            console.error('[API /api/place-order] Cart is empty');
            return res.status(400).send('Cart is empty');
        }

        // Рассчитываем общую сумму
        let totalAmount = 0;
        for (const item of items) {
            const bookResult = await client.query('SELECT price FROM books WHERE book_id = \$1', [item.book_id]);
            if (bookResult.rows.length === 0) {
                await client.query('ROLLBACK');
                client.release();
                console.error('[API /api/place-order] Book not found');
                return res.status(400).send('Book not found');
            }
            totalAmount += bookResult.rows[0].price * item.quantity;
        }

        // Создаем заказ
        const orderResult = await client.query('INSERT INTO orders (user_id, total_amount, status, shipping_method, payment_method, address) VALUES (\$1, \$2, \$3, \$4, \$5, \$6) RETURNING order_id', [userId, totalAmount, 'Pending', shipping_method, payment_method, address]);
        const orderId = orderResult.rows[0].order_id;

        // Добавляем элементы заказа
        for (const item of items) {
            const bookResult = await client.query('SELECT price FROM books WHERE book_id = \$1', [item.book_id]);
            const unitPrice = bookResult.rows[0].price;
            await client.query('INSERT INTO order_items (order_id, book_id, quantity, unit_price, total_price) VALUES (\$1, \$2, \$3, \$4, \$5)', [orderId, item.book_id, item.quantity, unitPrice, unitPrice * item.quantity]);
        }

        // Очищаем корзину
        await client.query('DELETE FROM cart_items WHERE cart_id = \$1', [cartId]);

        // Фиксируем транзакцию
        await client.query('COMMIT');

        client.release();
        console.log('[API /api/place-order] Order placed successfully');
        res.json({ orderId });
    } catch (err) {
        console.error('[API /api/place-order] Error:', err);
        res.status(500).send('Server error');
    }
});

app.get('/api/order-details', authenticateToken, async (req, res) => {
    const orderId = req.query.order_id;
    if (!orderId) {
        return res.status(400).send('Missing order_id');
    }
    try {
        const client = await pool.connect();

        // Получаем информацию о заказе
        const orderResult = await client.query('SELECT * FROM orders WHERE order_id = \$1', [orderId]);
        if (orderResult.rows.length === 0) {
            client.release();
            return res.status(404).send('Order not found');
        }
        const order = orderResult.rows[0];

        // Получаем элементы заказа
        const itemsResult = await client.query('SELECT order_items.book_id, books.title, order_items.quantity, order_items.unit_price, order_items.total_price FROM order_items LEFT JOIN books ON order_items.book_id = books.book_id WHERE order_items.order_id = \$1', [orderId]);
        const items = itemsResult.rows;

        client.release();
        res.json({ ...order, order_items: items });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// Маршрут для получения корзины
app.get('/api/cart', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    try {
        const client = await pool.connect();
        const cartResult = await client.query('SELECT cart_id FROM cart WHERE user_id = \$1', [userId]);
        if (cartResult.rows.length === 0) {
            client.release();
            return res.json([]);
        }
        const cartId = cartResult.rows[0].cart_id;

        const itemsResult = await client.query('SELECT book_id, quantity FROM cart_items WHERE cart_id = \$1', [cartId]);
        const items = itemsResult.rows;

        // Получаем информацию о книгах
        const books = [];
        for (const item of items) {
            const bookResult = await client.query('SELECT books.book_id, books.title, books.price, book_images.image_url FROM books LEFT JOIN book_images ON books.book_id = book_images.book_id AND book_images.is_main = TRUE WHERE books.book_id = \$1', [item.book_id]);
            if (bookResult.rows.length > 0) {
                books.push({
                    book_id: bookResult.rows[0].book_id,
                    title: bookResult.rows[0].title,
                    price: bookResult.rows[0].price,
                    image_url: bookResult.rows[0].image_url,
                    quantity: item.quantity
                });
            }
        }

        client.release();
        res.json(books);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

app.post('/api/logout', authenticateToken, (req, res) => {
    // Проверка токена и удаление его из хранилища, если необходимо
    res.send('Logged out');
});

// Маршрут для регистрации
app.post('/api/register', async (req, res) => {
    const { username, password, email, first_name, last_name, phone, address } = req.body;
    if (!username || !password || !email) {
        return res.status(400).send('Missing required fields');
    }
    try {
        const client = await pool.connect();
        // Проверка существования пользователя
        const userResult = await client.query('SELECT * FROM users WHERE username = \$1', [username]);
        if (userResult.rows.length > 0) {
            client.release();
            return res.status(400).send('Username already exists');
        }

        // Хеширование пароля
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Добавление пользователя в базу данных
        await client.query('INSERT INTO users (username, password_hash, email, first_name, last_name, phone, address) VALUES (\$1, \$2, \$3, \$4, \$5, \$6, \$7)', [username, hashedPassword, email, first_name, last_name, phone, address]);

        client.release();
        res.send('User registered successfully');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// Маршрут для входа
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).send('Missing username or password');
    }
    try {
        const client = await pool.connect();
        const userResult = await client.query('SELECT * FROM users WHERE username = \$1', [username]);
        client.release();
        if (userResult.rows.length === 0) {
            return res.status(400).send('Invalid username or password');
        }

        const user = userResult.rows[0];
        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) {
            return res.status(400).send('Invalid username or password');
        }

        // Создание JWT токена
        const token = jwt.sign({ userId: user.user_id, username: user.username }, 'your_jwt_secret', { expiresIn: '1h' });

        res.json({ token });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// Middleware для проверки JWT
function authenticateToken(req, res, next) {
    const token = req.headers['authorization'];
    if (!token) return res.status(401).send('Access denied');

    jwt.verify(token, 'your_jwt_secret', (err, user) => {
        if (err) return res.status(403).send('Invalid token');
        req.user = user;
        next();
    });
}

// Маршрут для получения информации о пользователе
app.get('/api/profile', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    try {
        const client = await pool.connect();
        const userResult = await client.query('SELECT * FROM users WHERE user_id = \$1', [userId]);
        client.release();
        if (userResult.rows.length === 0) {
            return res.status(404).send('User not found');
        }
        res.json(userResult.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// Маршрут для обновления информации о пользователе
app.post('/api/profile', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { first_name, last_name, phone, address } = req.body;
    try {
        const client = await pool.connect();
        await client.query('UPDATE users SET first_name = \$1, last_name = \$2, phone = \$3, address = \$4 WHERE user_id = \$5', [first_name, last_name, phone, address, userId]);
        client.release();
        res.send('Profile updated');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// Маршрут для получения заказов пользователя
app.get('/api/orders', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    try {
        const client = await pool.connect();
        const ordersResult = await client.query('SELECT * FROM orders WHERE user_id = \$1', [userId]);
        client.release();
        res.json(ordersResult.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});