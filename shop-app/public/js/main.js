let products = [];
let categories = new Set();

// Проверка авторизации при загрузке страницы
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    await loadProducts();
    updateCartCount();
});

// Проверка статуса авторизации
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
            
            // Если администратор, показываем ссылку на админку
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
    } catch (error) {
        console.error('Ошибка при проверке авторизации:', error);
    }
}

// Загрузка товаров
async function loadProducts() {
    try {
        const response = await fetch('/api/products');
        products = await response.json();
        
        // Собираем уникальные категории
        products.forEach(product => categories.add(product.category));
        
        displayProducts(products);
        populateCategories();
    } catch (error) {
        console.error('Ошибка при загрузке товаров:', error);
    }
}

// Заполнение выпадающего списка категорий
function populateCategories() {
    const categoryFilter = document.getElementById('category-filter');
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categoryFilter.appendChild(option);
    });
}

// Отображение товаров
function displayProducts(productsToShow) {
    const productList = document.getElementById('product-list');
    productList.innerHTML = '';
    
    if (productsToShow.length === 0) {
        productList.innerHTML = '<p class="no-products">Товары не найдены</p>';
        return;
    }
    
    productsToShow.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        
        const inStock = product.stock > 0;
        
        card.innerHTML = `
            <img src="${product.image_url}" alt="${product.name}" onerror="this.src='https://via.placeholder.com/200'">
            <h3>${product.name}</h3>
            <p class="description">${product.description}</p>
            <p class="price">${product.price} руб.</p>
            <p class="${inStock ? 'stock' : 'out-of-stock'}">
                ${inStock ? `В наличии: ${product.stock} шт.` : 'Нет в наличии'}
            </p>
            <button onclick="addToCart(${product.id})" ${inStock ? '' : 'disabled'}>
                ${inStock ? 'В корзину' : 'Нет в наличии'}
            </button>
        `;
        
        productList.appendChild(card);
    });
}

// Поиск товаров
function searchProducts() {
    const query = document.getElementById('search-input').value.toLowerCase();
    
    const filteredProducts = products.filter(product => 
        product.name.toLowerCase().includes(query) || 
        product.description.toLowerCase().includes(query)
    );
    
    displayProducts(filteredProducts);
}

// Фильтрация по категории
function filterByCategory() {
    const category = document.getElementById('category-filter').value;
    
    if (category) {
        const filteredProducts = products.filter(product => product.category === category);
        displayProducts(filteredProducts);
    } else {
        displayProducts(products);
    }
}

// Добавление в корзину
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product || product.stock <= 0) return;
    
    // Получаем текущую корзину
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    
    const cartItem = cart.find(item => item.id === productId);
    
    if (cartItem) {
        if (cartItem.quantity < product.stock) {
            cartItem.quantity++;
        } else {
            alert('Недостаточно товара на складе');
            return;
        }
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            quantity: 1,
            maxStock: product.stock,
            image: product.image_url
        });
    }
    
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
    
    // Анимация кнопки
    const button = event.target;
    button.textContent = 'Добавлено!';
    button.style.background = '#28a745';
    
    setTimeout(() => {
        button.textContent = 'В корзину';
        button.style.background = '#007bff';
    }, 1000);
}

// Обновление счетчика товаров в корзине
function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    const cartCountElements = document.querySelectorAll('#cart-count');
    cartCountElements.forEach(el => {
        el.textContent = totalItems;
    });
}

// Выход из системы
async function logout() {
    try {
        await fetch('/api/logout', { method: 'POST' });
        localStorage.removeItem('cart');
        window.location.href = '/';
    } catch (error) {
        console.error('Ошибка при выходе:', error);
    }
}