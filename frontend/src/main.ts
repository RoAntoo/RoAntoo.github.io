interface Product {
  id: string;
  title: string;
  price: number;
  imageUrl: string;
  description: string;
  categoria: string;
}

// Los productos ahora se cargan dinámicamente desde el backend
let PRODUCTS: Product[] = [];
let activeCategory: string | null = null;
let currentSearchQuery: string = '';

// Estado del Carrito
let cartItems: Product[] = [];
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Elementos del DOM
const cartBtn = document.getElementById('cartBtn');
const closeCartBtn = document.getElementById('closeCartBtn');
const cartSidebar = document.getElementById('cartSidebar');
const cartOverlay = document.getElementById('cartOverlay');
const cartItemsContainer = document.getElementById('cartItemsContainer');
const cartTotalPrice = document.getElementById('cartTotalPrice');
const checkoutForm = document.getElementById('checkoutForm');
const cartCountElement = document.getElementById('cartCount');
const searchInput = document.getElementById('searchInput') as HTMLInputElement | null;

// Funciones del Modal
let lastFocusedElement: HTMLElement | null = null;
let lastFocusedBeforeModal: HTMLElement | null = null;

function toggleCart() {
  if (cartSidebar && cartOverlay) {
    const isHidden = cartSidebar.classList.contains('hidden');

    if (isHidden) {
      // Abrir carrito
      lastFocusedElement = document.activeElement as HTMLElement;
      cartSidebar.classList.remove('hidden');
      cartOverlay.classList.remove('hidden');
      closeCartBtn?.focus();
    } else {
      // Cerrar carrito
      cartSidebar.classList.add('hidden');
      cartOverlay.classList.add('hidden');
      if (lastFocusedElement) {
        lastFocusedElement.focus();
      }
    }
  }
}

function showAddedFeedback(button: HTMLButtonElement) {
  const originalText = button.innerText;
  button.innerText = '[ ADDED ]';
  button.style.background = 'var(--accent-pink)';
  button.style.color = 'var(--bg-color)';

  setTimeout(() => {
    button.innerText = originalText;
    button.style.background = 'transparent';
    button.style.color = 'var(--accent-pink)';
  }, 1000);
}

let lastFocusedFromCatalog: HTMLElement | null = null;

// Vista de Detalles
function openProductDetails(productId: string) {
  const product = PRODUCTS.find(p => p.id === productId);
  if (!product) return;

  const catalog = document.querySelector('.products-section');
  const hero = document.querySelector('.hero');
  const detailView = document.getElementById('productDetailView');

  if (!catalog || !detailView || !hero) return;

  lastFocusedFromCatalog = document.activeElement as HTMLElement;

  // Inyectar datos
  const img = document.getElementById('detailImage') as HTMLImageElement;
  const title = document.getElementById('detailTitle');
  const price = document.getElementById('detailPrice');
  const desc = document.getElementById('detailDesc');
  const btn = document.getElementById('detailAddToCartBtn') as HTMLButtonElement;

  if (img) img.src = product.imageUrl;
  if (title) title.textContent = product.title;
  if (price) price.textContent = `$${product.price.toLocaleString('es-AR')}`;
  if (desc) desc.textContent = product.description;
  if (btn) btn.setAttribute('data-id', product.id);

  // Transición
  hero.classList.add('hidden');
  catalog.classList.add('hidden');
  detailView.classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Focus
  const backBtn = document.getElementById('backToCatalogBtn');
  if (backBtn) backBtn.focus();
}

function closeProductDetails() {
  const catalog = document.querySelector('.products-section');
  const hero = document.querySelector('.hero');
  const detailView = document.getElementById('productDetailView');

  if (!catalog || !detailView || !hero) return;

  detailView.classList.add('hidden');
  hero.classList.remove('hidden');
  catalog.classList.remove('hidden');

  if (lastFocusedFromCatalog && typeof lastFocusedFromCatalog.focus === 'function') {
    lastFocusedFromCatalog.focus();
  }
}
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && cartSidebar && !cartSidebar.classList.contains('hidden')) {
    toggleCart();
  }
});

if (cartBtn) cartBtn.addEventListener('click', toggleCart);
if (closeCartBtn) closeCartBtn.addEventListener('click', toggleCart);
if (cartOverlay) cartOverlay.addEventListener('click', toggleCart);

// Helper para cálculo de total
function calculateTotal(): number {
  return cartItems.reduce((sum, item) => sum + item.price, 0);
}

// Lógica del Carrito
function renderCart() {
  if (!cartItemsContainer || !cartTotalPrice || !cartCountElement) return;

  // Actualizar contador
  cartCountElement.textContent = cartItems.length.toString();

  // Actualizar total
  const total = calculateTotal();
  cartTotalPrice.textContent = `$${total.toLocaleString('es-AR')}`;

  // Limpiar lista
  cartItemsContainer.innerHTML = '';

  if (cartItems.length === 0) {
    const emptyMsg = document.createElement('div');
    emptyMsg.className = 'cart-empty';
    emptyMsg.textContent = '[ CARRITO_VACIO ]';
    cartItemsContainer.appendChild(emptyMsg);
    return;
  }

  // Renderizar items
  cartItems.forEach((item, index) => {
    const cartItem = document.createElement('div');
    cartItem.className = 'cart-item';

    const img = document.createElement('img');
    img.src = item.imageUrl;
    img.alt = item.title;
    img.className = 'cart-item-img';
    img.onerror = () => { img.src = 'https://placehold.co/60x80/14141e/ff2a85?text=?'; };

    const info = document.createElement('div');
    info.className = 'cart-item-info';

    const title = document.createElement('div');
    title.className = 'cart-item-title';
    title.textContent = item.title;

    const price = document.createElement('div');
    price.className = 'cart-item-price';
    price.textContent = `$${item.price.toLocaleString('es-AR')}`;

    info.appendChild(title);
    info.appendChild(price);

    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-btn';
    removeBtn.textContent = '×';
    removeBtn.addEventListener('click', () => {
      cartItems.splice(index, 1);
      renderCart();
    });

    cartItem.appendChild(img);
    cartItem.appendChild(info);
    cartItem.appendChild(removeBtn);

    cartItemsContainer.appendChild(cartItem);
  });
}

function addToCart(productId: string): boolean {
  const product = PRODUCTS.find(p => p.id === productId);
  if (!product) return false;

  // Evitar duplicados (es un producto digital)
  if (cartItems.find(item => item.id === productId)) {
    return false;
  }

  cartItems.push(product);
  renderCart();

  // Micro-animación al añadir al carrito
  if (cartCountElement) {
    cartCountElement.style.color = 'var(--accent-pink)';
    cartCountElement.style.transform = 'scale(1.5)';
    setTimeout(() => {
      cartCountElement.style.color = 'inherit';
      cartCountElement.style.transform = 'scale(1)';
    }, 200);
  }

  return true;
}

// Renderizar Categorías
function renderCategories() {
  const categories = [...new Set(PRODUCTS.map(p => p.categoria))];
  const filtersContainer = document.getElementById('categoryFilters');
  if (!filtersContainer) return;

  filtersContainer.innerHTML = '';

  // Botón Todos
  const allBtn = document.createElement('button');
  allBtn.className = `category-btn ${activeCategory === null ? 'active' : ''}`;
  allBtn.textContent = 'Todos';
  allBtn.addEventListener('click', () => {
    activeCategory = null;
    renderCategories();
    renderProducts();
  });
  filtersContainer.appendChild(allBtn);

  // Botones por categoría
  categories.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = `category-btn ${activeCategory === cat ? 'active' : ''}`;
    btn.dataset.category = cat;
    btn.textContent = cat;
    btn.addEventListener('click', () => {
      activeCategory = cat;
      renderCategories();
      renderProducts();
    });
    filtersContainer.appendChild(btn);
  });
}

// Renderizar Productos en Home
function renderProducts() {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;

  let productosFiltrados = PRODUCTS;

  // Filtrar por categoría
  if (activeCategory !== null) {
    productosFiltrados = productosFiltrados.filter(p => p.categoria === activeCategory);
  }

  // Filtrar por búsqueda
  if (currentSearchQuery.trim() !== '') {
    const q = currentSearchQuery.toLowerCase().trim();
    productosFiltrados = productosFiltrados.filter(p =>
      p.title.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q)
    );
  }

  grid.innerHTML = '';

  if (productosFiltrados.length === 0) {
    grid.innerHTML = '<p style="color:var(--text-muted);text-align:center;width:100%;grid-column:1/-1;">[ NO_HAY_DATOS_EN_ESTE_SECTOR ]</p>';
    return;
  }

  productosFiltrados.forEach(product => {
    const card = document.createElement('div');
    card.className = 'product-card';

    const img = document.createElement('img');
    img.src = product.imageUrl;
    img.alt = product.title;
    img.className = 'product-image';
    img.onerror = () => { img.src = 'https://placehold.co/400x500/14141e/ff2a85?text=NO+IMAGE+FOUND'; };

    const infoDiv = document.createElement('div');
    infoDiv.className = 'product-info';

    const title = document.createElement('h3');
    title.className = 'product-title';
    title.textContent = product.title;

    const price = document.createElement('p');
    price.className = 'product-price';
    price.textContent = `$${product.price.toLocaleString('es-AR')}`;

    const btn = document.createElement('button');
    btn.className = 'cyber-btn cyber-btn-pink add-to-cart-btn';
    btn.setAttribute('data-id', product.id);
    btn.textContent = '[ AGREGAR_AL_CARRITO ]';

    btn.addEventListener('click', (e) => {
      const target = e.currentTarget as HTMLButtonElement;
      const added = addToCart(product.id);

      if (added) {
        showAddedFeedback(target);
      }
    });

    infoDiv.appendChild(title);
    infoDiv.appendChild(price);
    infoDiv.appendChild(btn);

    card.appendChild(img);
    card.appendChild(infoDiv);

    card.style.cursor = 'pointer';
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');

    const handleCardAction = (e: Event) => {
      if ((e.target as HTMLElement).closest('.add-to-cart-btn')) return;
      openProductDetails(product.id);
    };

    card.addEventListener('click', handleCardAction);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleCardAction(e);
      }
    });

    grid.appendChild(card);
  });
}

// Evento de Checkout (Conectado a la API)
if (checkoutForm) {
  checkoutForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (cartItems.length === 0) {
      alert("⚠️ Error: El carrito está vacío.");
      return;
    }

    const email = (document.getElementById('emailInput') as HTMLInputElement).value;
    const submitBtn = checkoutForm.querySelector('button[type="submit"]') as HTMLButtonElement;

    // UI Estado de carga
    const originalBtnText = submitBtn.innerText;
    submitBtn.innerText = '[ ENVIANDO... ]';
    submitBtn.disabled = true;

    try {
      const response = await fetch(`${API_URL}/compras`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailCliente: email,
          productoIds: cartItems.map(p => p.id)
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fallo de conexión encriptada');
      }

      // Vaciar carrito
      cartItems = [];
      renderCart();
      toggleCart();

      // Mostrar Modal de Éxito
      const successModal = document.getElementById('checkoutSuccessModal');
      const closeSuccessBtn = document.getElementById('closeSuccessBtn');
      if (successModal) {
        lastFocusedBeforeModal = document.activeElement as HTMLElement;
        successModal.classList.remove('hidden');
        if (closeSuccessBtn) closeSuccessBtn.focus();
      }

    } catch (error: any) {
      alert(`⚠️ ERROR EN EL ENLACE: ${error.message}`);
    } finally {
      submitBtn.innerText = originalBtnText;
      submitBtn.disabled = false;
    }
  });
}

// Inicializar la App
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos timeout

    const res = await fetch(`${API_URL}/productos`, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error('Error al cargar catálogo');
    const productosDb = await res.json();

    // Mapear al formato esperado por el frontend omitiendo precios inválidos
    PRODUCTS = productosDb.reduce((acc: Product[], p: any) => {
      let precioValidado = typeof p.precio === 'string' ? parseFloat(p.precio) : p.precio;
      if (typeof precioValidado !== 'number' || isNaN(precioValidado)) {
        console.warn(`Producto omitido por precio inválido: ${p.titulo}`);
        return acc;
      }

      acc.push({
        id: p.id,
        title: p.titulo,
        price: precioValidado,
        description: p.descripcion,
        categoria: p.categoria,
        imageUrl: p.imagenUrl
      });
      return acc;
    }, []);

    renderCategories();
    renderProducts();

    // Event listener para buscador
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        currentSearchQuery = target.value;
        renderProducts();
      });
    }

  } catch (error) {
    console.error('No se pudo cargar el catálogo:', error);
    const grid = document.getElementById('productsGrid');
    if (grid) grid.innerHTML = '<p style="color:red;text-align:center;width:100%">[ ERROR_CONEXIÓN_CATÁLOGO ]</p>';
  }

  // Eventos de la Vista de Detalles
  const backBtn = document.getElementById('backToCatalogBtn');
  if (backBtn) {
    backBtn.addEventListener('click', closeProductDetails);
  }

  const detailAddBtn = document.getElementById('detailAddToCartBtn');
  if (detailAddBtn) {
    detailAddBtn.addEventListener('click', (e) => {
      const target = e.currentTarget as HTMLButtonElement;
      const productId = target.getAttribute('data-id');
      if (!productId) return;

      const added = addToCart(productId);
      if (added) {
        showAddedFeedback(target);
      }
    });
  }

  const closeSuccessBtn = document.getElementById('closeSuccessBtn');
  if (closeSuccessBtn) {
    closeSuccessBtn.addEventListener('click', () => {
      const successModal = document.getElementById('checkoutSuccessModal');
      if (successModal) {
        successModal.classList.add('hidden');
        if (lastFocusedBeforeModal) {
          lastFocusedBeforeModal.focus();
        }
      }
    });
  }

  renderCart();
});
