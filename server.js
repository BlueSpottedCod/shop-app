const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');

const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Для разработки, в продакшн установите true с HTTPS
}));

// Подключение к базе данных
const db = new sqlite3.Database('./database.sqlite');

// Создание таблиц
db.serialize(() => {
    // Таблица пользователей
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        email TEXT,
        role TEXT DEFAULT 'user',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Таблица товаров
    db.run(`CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        description TEXT,
        price REAL,
        category TEXT,
        stock INTEGER,
        image_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Таблица заказов
    db.run(`CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        total_amount REAL,
        status TEXT DEFAULT 'pending',
        order_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )`);

    // Таблица элементов заказа
    db.run(`CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER,
        product_id INTEGER,
        quantity INTEGER,
        price REAL,
        FOREIGN KEY (order_id) REFERENCES orders (id),
        FOREIGN KEY (product_id) REFERENCES products (id)
    )`);

    // Добавление тестовых данных
    const saltRounds = 10;
    
    // Создание тестового администратора
    db.get("SELECT * FROM users WHERE username = ?", ['admin'], (err, row) => {
        if (!row) {
            bcrypt.hash('admin123', saltRounds, (err, hash) => {
                db.run("INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)",
                    ['admin', hash, 'admin@shop.com', 'admin']);
            });
        }
    });

    // Добавление тестовых товаров
    db.get("SELECT COUNT(*) as count FROM products", (err, row) => {
        if (row.count === 0) {
            const products = [
                ['Холодильник Samsung', 'Двухкамерный холодильник', 45000, 'Холодильники', 10, '/images/fridge.jpg'],
                ['Стиральная машина LG', 'Фронтальная загрузка', 35000, 'Стиральные машины', 15, '/images/washer.jpg'],
                ['Микроволновка Panasonic', 'С грилем', 12000, 'Микроволновки', 20, '/images/microwave.jpg'],
                ['Пылесос Dyson', 'Беспроводной', 28000, 'Пылесосы', 8, '/images/vacuum.jpg']
            ];
            
            const stmt = db.prepare("INSERT INTO products (name, description, price, category, stock, image_url) VALUES (?, ?, ?, ?, ?, ?)");
            products.forEach(product => stmt.run(product));
            stmt.finalize();
        }
    });
});

// Маршруты
// Регистрация
app.post('/api/register', (req, res) => {
    const { username, password, email } = req.body;
    
    bcrypt.hash(password, 10, (err, hash) => {
        if (err) {
            return res.status(500).json({ error: 'Ошибка при хешировании пароля' });
        }
        
        db.run("INSERT INTO users (username, password, email) VALUES (?, ?, ?)",
            [username, hash, email],
            function(err) {
                if (err) {
                    return res.status(400).json({ error: 'Пользователь уже существует' });
                }
                res.json({ success: true, message: 'Регистрация успешна' });
            });
    });
});

// Авторизация
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
        if (!user) {
            return res.status(401).json({ error: 'Пользователь не найден' });
        }
        
        bcrypt.compare(password, user.password, (err, result) => {
            if (result) {
                req.session.userId = user.id;
                req.session.username = user.username;
                req.session.role = user.role;
                
                res.json({ 
                    success: true, 
                    role: user.role,
                    message: 'Вход выполнен успешно' 
                });
            } else {
                res.status(401).json({ error: 'Неверный пароль' });
            }
        });
    });
});

// Выход
app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// Получение всех товаров
app.get('/api/products', (req, res) => {
    db.all("SELECT * FROM products", (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Ошибка при получении товаров' });
        }
        res.json(rows);
    });
});

// Получение одного товара
app.get('/api/products/:id', (req, res) => {
    db.get("SELECT * FROM products WHERE id = ?", [req.params.id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: 'Ошибка при получении товара' });
        }
        if (!row) {
            return res.status(404).json({ error: 'Товар не найден' });
        }
        res.json(row);
    });
});

// Добавление товара (только для админа)
app.post('/api/products', (req, res) => {
    if (req.session.role !== 'admin') {
        return res.status(403).json({ error: 'Доступ запрещен' });
    }
    
    const { name, description, price, category, stock, image_url } = req.body;
    
    db.run("INSERT INTO products (name, description, price, category, stock, image_url) VALUES (?, ?, ?, ?, ?, ?)",
        [name, description, price, category, stock, image_url],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Ошибка при добавлении товара' });
            }
            res.json({ 
                success: true, 
                id: this.lastID,
                message: 'Товар добавлен успешно' 
            });
        });
});

// Обновление товара (только для админа)
app.put('/api/products/:id', (req, res) => {
    if (req.session.role !== 'admin') {
        return res.status(403).json({ error: 'Доступ запрещен' });
    }
    
    const { name, description, price, category, stock, image_url } = req.body;
    
    db.run("UPDATE products SET name = ?, description = ?, price = ?, category = ?, stock = ?, image_url = ? WHERE id = ?",
        [name, description, price, category, stock, image_url, req.params.id],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Ошибка при обновлении товара' });
            }
            res.json({ success: true, message: 'Товар обновлен успешно' });
        });
});

// Удаление товара (только для админа)
app.delete('/api/products/:id', (req, res) => {
    if (req.session.role !== 'admin') {
        return res.status(403).json({ error: 'Доступ запрещен' });
    }
    
    db.run("DELETE FROM products WHERE id = ?", [req.params.id], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Ошибка при удалении товара' });
        }
        res.json({ success: true, message: 'Товар удален успешно' });
    });
});

// Создание заказа
app.post('/api/orders', (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Необходима авторизация' });
    }
    
    const { items, total_amount } = req.body;
    
    db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        
        db.run("INSERT INTO orders (user_id, total_amount) VALUES (?, ?)",
            [req.session.userId, total_amount],
            function(err) {
                if (err) {
                    db.run("ROLLBACK");
                    return res.status(500).json({ error: 'Ошибка при создании заказа' });
                }
                
                const orderId = this.lastID;
                const stmt = db.prepare("INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)");
                
                items.forEach(item => {
                    stmt.run([orderId, item.product_id, item.quantity, item.price]);
                    
                    // Обновляем количество на складе
                    db.run("UPDATE products SET stock = stock - ? WHERE id = ?", 
                        [item.quantity, item.product_id]);
                });
                
                stmt.finalize();
                db.run("COMMIT");
                
                res.json({ 
                    success: true, 
                    orderId: orderId,
                    message: 'Заказ создан успешно' 
                });
            });
    });
});

// Получение заказов пользователя
app.get('/api/user/orders', (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Необходима авторизация' });
    }
    
    db.all("SELECT * FROM orders WHERE user_id = ? ORDER BY order_date DESC", 
        [req.session.userId], 
        (err, orders) => {
            if (err) {
                return res.status(500).json({ error: 'Ошибка при получении заказов' });
            }
            res.json(orders);
        });
});

// Получение всех заказов (для админа)
app.get('/api/admin/orders', (req, res) => {
    if (req.session.role !== 'admin') {
        return res.status(403).json({ error: 'Доступ запрещен' });
    }
    
    db.all(`SELECT o.*, u.username 
            FROM orders o 
            JOIN users u ON o.user_id = u.id 
            ORDER BY o.order_date DESC`, 
        (err, orders) => {
            if (err) {
                return res.status(500).json({ error: 'Ошибка при получении заказов' });
            }
            res.json(orders);
        });
});

// Проверка статуса авторизации
app.get('/api/auth/status', (req, res) => {
    if (req.session.userId) {
        res.json({
            authenticated: true,
            username: req.session.username,
            role: req.session.role
        });
    } else {
        res.json({ authenticated: false });
    }
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
});