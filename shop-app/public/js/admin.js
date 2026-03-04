let editingProductId = null;

document.addEventListener('DOMContentLoaded', async () => {
    await checkAdminAuth();
    await loadProducts();
    await loadOrders();
});

// Проверка прав администратора
async function checkAdminAuth() {
    try {
        const response = await fetch('/api/auth/status');
        const data = await response.json();
        
        if (!data.authenticated || data.role !== 'admin') {
            window.location.href = '/login.html';
            return;
        }
        
        document.getElementById('username').textContent = data.username;
    } catch (error) {
        console.error('Ошибка при проверке авторизации:', error);
        window.location.href = '/login.html';
    }
}

// Загрузка товаров для админки
async function loadProducts() {
    try {
        const response = await fetch('/api/products');
        const products = await response.json();
        displayAdminProducts(products);
    } catch (error) {
        console.error('Ошибка при загрузке товаров:', error);
    }
}

// Отображение товаров в админке
function displayAdminProducts(products) {
    const productsList = document.getElementById('products-list');
    productsList.innerHTML = '';
    
    products.forEach(product => {
        const card = document.createElement('div');
        card.className = 'admin-product-card';
        card.innerHTML = `
            <h3>${product.name}</h3>
            <p>${product.description}</p>
            <p><strong>Цена:</strong> ${product.price} руб.</p>
            <p><strong>Категория:</strong> ${product.category}</p>
            <p><strong>В наличии:</strong> ${product.stock} шт.</p>
            <img src="${product.image_url}" alt="${product.name}" style="max-width: 100px; margin: 10px 0;">
            <button onclick="editProduct(${product.id})">Редактировать</button>
            <button onclick="deleteProduct(${product.id})" style="background: #dc3545;">Удалить</button>
        `;
        productsList.appendChild(card);
    });
}

// Показать форму добавления товара
function showAddProductForm() {
    editingProductId = null;
    document.getElementById('add-product-form').style.display = 'block';
    document.getElementById('product-form').reset();
    document.querySelector('#add-product-form h3').textContent = 'Добавить новый товар';
}

// Скрыть форму добавления товара
function hideAddProductForm() {
    document.getElementById('add-product-form').style.display = 'none';
}

// Редактирование товара
async function editProduct(productId) {
    try {
        const response = await fetch(`/api/products/${productId}`);
        const product = await response.json();
        
        editingProductId = productId;
        
        document.getElementById('product-name').value = product.name;
        document.getElementById('product-description').value = product.description;
        document.getElementById('product-price').value = product.price;
        document.getElementById('product-category').value = product.category;
        document.getElementById('product-stock').value = product.stock;
        document.getElementById('product-image').value = product.image_url;
        
        document.getElementById('add-product-form').style.display = 'block';
        document.querySelector('#add-product-form h3').textContent = 'Редактировать товар';
    } catch (error) {
        console.error('Ошибка при загрузке товара:', error);
    }
}

// Обработка формы товара
document.getElementById('product-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const productData = {
        name: document.getElementById('product-name').value,
        description: document.getElementById('product-description').value,
        price: parseFloat(document.getElementById('product-price').value),
        category: document.getElementById('product-category').value,
        stock: parseInt(document.getElementById('product-stock').value),
        image_url: document.getElementById('product-image').value
    };
    
    try {
        let response;
        
        if (editingProductId) {
            // Обновление товара
            response = await fetch(`/api/products/${editingProductId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(productData)
            });
        } else {
            // Добавление нового товара
            response = await fetch('/api/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(productData)
            });
        }
        
        const data = await response.json();
        
        if (data.success) {
            alert(data.message);
            hideAddProductForm();
            await loadProducts(); // Перезагружаем список товаров
        } else {
            alert('Ошибка: ' + data.error);
        }
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Произошла ошибка при сохранении товара');
    }
});

// Удаление товара
async function deleteProduct(productId) {
    if (!confirm('Вы уверены, что хотите удалить этот товар?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/products/${productId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Товар удален успешно');
            await loadProducts(); // Перезагружаем список товаров
        } else {
            alert('Ошибка при удалении: ' + data.error);
        }
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Произошла ошибка при удалении товара');
    }
}

// Загрузка заказов
async function loadOrders() {
    try {
        const response = await fetch('/api/admin/orders');
        const orders = await response.json();
        displayOrders(orders);
    } catch (error) {
        console.error('Ошибка при загрузке заказов:', error);
    }
}

// Отображение заказов
function displayOrders(orders) {
    const ordersList = document.getElementById('orders-list');
    
    if (orders.length === 0) {
        ordersList.innerHTML = '<p>Заказов пока нет</p>';
        return;
    }
    
    ordersList.innerHTML = '';
    
    orders.forEach(order => {
        const orderCard = document.createElement('div');
        orderCard.className = 'order-card';
        
        const orderDate = new Date(order.order_date).toLocaleString('ru-RU');
        
        orderCard.innerHTML = `
            <div class="order-header">
                <span><strong>Заказ №${order.id}</strong></span>
                <span>Пользователь: ${order.username}</span>
                <span>Сумма: ${order.total_amount} руб.</span>
                <span class="order-status status-${order.status}">${order.status === 'pending' ? 'В обработке' : 'Выполнен'}</span>
            </div>
            <div>Дата: ${orderDate}</div>
        `;
        
        ordersList.appendChild(orderCard);
    });
}

// Выход из системы
async function logout() {
    try {
        await fetch('/api/logout', { method: 'POST' });
        window.location.href = '/login.html';
    } catch (error) {
        console.error('Ошибка при выходе:', error);
    }
}