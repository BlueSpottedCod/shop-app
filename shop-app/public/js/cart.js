// Загрузка страницы корзины
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    loadCart();
});

// Проверка авторизации
async function checkAuth() {
    try {
        const response = await fetch('/api/auth/status');
        const data = await response.json();
        
        const authLinks = document.getElementById('auth-links');
        const userMenu = document.getElementById('user-menu');
        const usernameSpan = document.getElementById('username');
        
        if (data.authenticated) {
            authLinks.style.display = 'none';
            userMenu.style.display = 'block';
            usernameSpan.textContent = data.username;
            
            if (data.role === 'admin') {
                const adminLink = document.createElement('a');
                adminLink.href = '/admin.html';
                adminLink.textContent = 'Админ панель';
                adminLink.style.marginRight = '15px';
                userMenu.insertBefore(adminLink, usernameSpan);
            }
        } else {
            authLinks.style.display = 'block';
            userMenu.style.display = 'none';
        }
        
        return data.authenticated;
    } catch (error) {
        console.error('Ошибка при проверке авторизации:', error);
        return false;
    }
}

// Загрузка корзины
function loadCart() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const emptyCartMsg = document.getElementById('empty-cart-message');
    const cartContainer = document.getElementById('cart-items-container');
    const cartItems = document.getElementById('cart-items');
    const cartTotal = document.getElementById('cart-total');
    
    if (cart.length === 0) {
        emptyCartMsg.style.display = 'block';
        cartContainer.style.display = 'none';
        return;
    }
    
    emptyCartMsg.style.display = 'none';
    cartContainer.style.display = 'block';
    
    let total = 0;
    cartItems.innerHTML = '';
    
    cart.forEach((item, index) => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        
        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        cartItem.innerHTML = `
            <div class="cart-item-image">
                <img src="${item.image || 'https://via.placeholder.com/80'}" alt="${item.name}">
            </div>
            <div class="cart-item-details">
                <h4>${item.name}</h4>
                <p class="cart-item-price">${item.price} руб. × ${item.quantity}</p>
            </div>
            <div class="cart-item-total">
                <strong>${itemTotal} руб.</strong>
            </div>
            <div class="cart-item-actions">
                <button onclick="updateQuantity(${index}, -1)" class="quantity-btn">-</button>
                <span class="quantity">${item.quantity}</span>
                <button onclick="updateQuantity(${index}, 1)" class="quantity-btn" ${item.quantity >= item.maxStock ? 'disabled' : ''}>+</button>
                <button onclick="removeItem(${index})" class="remove-btn">Удалить</button>
            </div>
        `;
        
        cartItems.appendChild(cartItem);
    });
    
    cartTotal.textContent = total;
    updateCartCount();
}

// Обновление количества товара
async function updateQuantity(index, change) {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const item = cart[index];
    
    // Проверяем актуальное наличие на складе
    try {
        const response = await fetch(`/api/products/${item.id}`);
        const product = await response.json();
        
        const newQuantity = item.quantity + change;
        
        if (newQuantity < 1) {
            removeItem(index);
        } else if (newQuantity <= product.stock) {
            item.quantity = newQuantity;
            item.maxStock = product.stock;
            localStorage.setItem('cart', JSON.stringify(cart));
            loadCart(); // Перезагружаем корзину
        } else {
            alert(`В наличии только ${product.stock} шт.`);
        }
    } catch (error) {
        console.error('Ошибка при проверке наличия:', error);
    }
}

// Удаление товара из корзины
function removeItem(index) {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    cart.splice(index, 1);
    localStorage.setItem('cart', JSON.stringify(cart));
    loadCart(); // Перезагружаем корзину
    updateCartCount();
}

// Обновление счетчика товаров
function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    const cartCountElements = document.querySelectorAll('#cart-count');
    cartCountElements.forEach(el => {
        el.textContent = totalItems;
    });
}

// Оформление заказа
async function checkout() {
    // Проверяем авторизацию
    const authResponse = await fetch('/api/auth/status');
    const authData = await authResponse.json();
    
    if (!authData.authenticated) {
        alert('Для оформления заказа необходимо войти в систему');
        window.location.href = '/login.html';
        return;
    }
    
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    
    if (cart.length === 0) {
        alert('Корзина пуста');
        return;
    }
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    const orderData = {
        items: cart.map(item => ({
            product_id: item.id,
            quantity: item.quantity,
            price: item.price
        })),
        total_amount: total
    };
    
    try {
        const response = await fetch('/api/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert(`Заказ №${data.orderId} успешно оформлен!`);
            localStorage.removeItem('cart'); // Очищаем корзину
            window.location.href = '/'; // Возвращаемся на главную
        } else {
            alert('Ошибка при оформлении заказа: ' + data.error);
        }
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Произошла ошибка при оформлении заказа');
    }
}

// Выход из системы
async function logout() {
    try {
        await fetch('/api/logout', { method: 'POST' });
        localStorage.removeItem('cart');
        window.location.href = '/login.html';
    } catch (error) {
        console.error('Ошибка при выходе:', error);
    }
}