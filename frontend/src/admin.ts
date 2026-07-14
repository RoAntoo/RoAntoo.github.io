const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Elementos Login
const loginSection = document.getElementById('loginSection')!;
const dashboardSection = document.getElementById('dashboardSection')!;
const apiKeyInput = document.getElementById('apiKeyInput') as HTMLInputElement;
const loginBtn = document.getElementById('loginBtn')!;
const loginError = document.getElementById('loginError')!;
const logoutBtn = document.getElementById('logoutBtn')!;

// Elementos Dashboard
const tabBtns = document.querySelectorAll('.tab-btn');
const ordenesTab = document.getElementById('ordenesTab')!;
const productosTab = document.getElementById('productosTab')!;
const ordenesBody = document.getElementById('ordenesBody')!;
const productosBody = document.getElementById('productosBody')!;

// Elementos Formulario Producto
const mostrarFormBtn = document.getElementById('mostrarFormBtn')!;
const cancelarFormBtn = document.getElementById('cancelarFormBtn') as HTMLButtonElement;
const nuevoProductoFormContainer = document.getElementById('nuevoProductoFormContainer')!;
const nuevoProductoForm = document.getElementById('nuevoProductoForm') as HTMLFormElement;

// Modal de Edición
const modalEdicion = document.getElementById('modalEdicion') as HTMLDivElement;
const editarProductoForm = document.getElementById('editarProductoForm') as HTMLFormElement;
const cancelarEditBtn = document.getElementById('cancelarEditBtn') as HTMLButtonElement;

// Estado
let apiKey = '';
let categoriasDisponibles: string[] = [];

// --- INICIALIZACIÓN ---
// (Eliminado el auto-login con localStorage por seguridad)

loginBtn.addEventListener('click', async () => {
  const key = apiKeyInput.value.trim();
  if (key) {
    const textOriginal = loginBtn.innerText;
    loginBtn.innerText = 'AUTENTICANDO...';
    (loginBtn as HTMLButtonElement).disabled = true;
    
    const valido = await validarYEntrar(key);
    
    loginBtn.innerText = textOriginal;
    (loginBtn as HTMLButtonElement).disabled = false;
  }
});

apiKeyInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    loginBtn.click();
  }
});

logoutBtn.addEventListener('click', () => {
  apiKey = '';
  dashboardSection.classList.add('hidden');
  loginSection.classList.remove('hidden');
  apiKeyInput.value = '';
});

// --- PESTAÑAS ---
tabBtns.forEach(btn => {
  btn.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    tabBtns.forEach(b => b.classList.remove('active'));
    target.classList.add('active');

    const tabName = target.getAttribute('data-tab');
    if (tabName === 'ordenes') {
      ordenesTab.classList.remove('hidden');
      productosTab.classList.add('hidden');
      cargarOrdenes();
    } else {
      ordenesTab.classList.add('hidden');
      productosTab.classList.remove('hidden');
      cargarProductos();
    }
  });
});

// --- LÓGICA DE NUEVO PRODUCTO ---
mostrarFormBtn.addEventListener('click', () => {
  nuevoProductoFormContainer.classList.remove('hidden');
  mostrarFormBtn.classList.add('hidden');
});

cancelarFormBtn.addEventListener('click', () => {
  nuevoProductoFormContainer.classList.add('hidden');
  mostrarFormBtn.classList.remove('hidden');
  nuevoProductoForm.reset();
});

cancelarEditBtn.addEventListener('click', cerrarModalEdicion);
editarProductoForm.addEventListener('submit', manejarEdicionProducto);

nuevoProductoForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const submitBtn = nuevoProductoForm.querySelector('button[type="submit"]') as HTMLButtonElement;
  const originalText = submitBtn.innerText;
  submitBtn.innerText = 'GUARDANDO...';
  submitBtn.disabled = true;

  const payload = {
    titulo: (document.getElementById('prodTitulo') as HTMLInputElement).value,
    precio: parseInt((document.getElementById('prodPrecio') as HTMLInputElement).value, 10),
    categoria: (document.getElementById('prodCategoria') as HTMLInputElement).value,
    imagenUrl: (document.getElementById('prodImagen') as HTMLInputElement).value,
    driveUrl: (document.getElementById('prodDrive') as HTMLInputElement).value,
    descripcion: (document.getElementById('prodDesc') as HTMLTextAreaElement).value,
  };

  try {
    const res = await fetch(`${API_URL}/admin/productos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      let errorMsg = `Error ${res.status}`;
      try {
        const errorData = await res.json();
        if (errorData && errorData.error) {
          errorMsg = typeof errorData.error === 'string' ? errorData.error : JSON.stringify(errorData.error);
        }
      } catch (e) {
        // Ignorar error de parseo JSON (cuerpo vacío o texto plano)
      }
      throw new Error(errorMsg);
    }

    nuevoProductoForm.reset();
    nuevoProductoFormContainer.classList.add('hidden');
    mostrarFormBtn.classList.remove('hidden');
    cargarProductos(); // Recargar tabla
  } catch (err: any) {
    alert(`Error: ${err.message}`);
  } finally {
    submitBtn.innerText = originalText;
    submitBtn.disabled = false;
  }
});

// --- FUNCIONES CORE ---
async function validarYEntrar(key: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/admin/ordenes`, {
      headers: { 'x-api-key': key }
    });
    
    if (!res.ok) throw new Error('Inválida');

    // Autenticación exitosa
    apiKey = key;
    
    loginSection.classList.add('hidden');
    loginError.classList.add('hidden');
    dashboardSection.classList.remove('hidden');
    
    const ordenes = await res.json();
    dibujarOrdenes(ordenes);
    return true;
  } catch(err: any) {
    apiKey = '';
    loginError.classList.remove('hidden');
    loginError.textContent = 'Acceso Denegado';
    return false;
  }
}

async function cargarOrdenes() {
  ordenesBody.innerHTML = '<tr><td colspan="5">Cargando...</td></tr>';
  try {
    const res = await fetch(`${API_URL}/admin/ordenes`, {
      headers: { 'x-api-key': apiKey }
    });
    
    if (!res.ok) {
      if (res.status === 401) throw new Error('API Key Inválida');
      throw new Error('Error al cargar órdenes');
    }

    const ordenes = await res.json();
    dibujarOrdenes(ordenes);
  } catch (err: any) {
    if (err.message === 'API Key Inválida') {
      logoutBtn.click();
      loginError.classList.remove('hidden');
      loginError.textContent = 'Acceso Denegado';
    } else {
      ordenesBody.innerHTML = `<tr><td colspan="5" style="color:red">${err.message}</td></tr>`;
    }
  }
}

async function cargarProductos() {
  productosBody.innerHTML = '<tr><td colspan="4">Cargando...</td></tr>';
  try {
    const res = await fetch(`${API_URL}/admin/productos`, {
      headers: { 'x-api-key': apiKey }
    });
    
    if (!res.ok) throw new Error('Error al cargar productos');

    const productos = await res.json();
    actualizarDatalistCategorias(productos);
    dibujarProductos(productos);
  } catch (err: any) {
    productosBody.innerHTML = `<tr><td colspan="4" style="color:red">${err.message}</td></tr>`;
  }
}

function actualizarDatalistCategorias(productos: any[]) {
  categoriasDisponibles = [...new Set(productos.map(p => p.categoria).filter(Boolean))] as string[];
}

function configurarDropdown(inputId: string, dropdownId: string) {
  const input = document.getElementById(inputId) as HTMLInputElement;
  const dropdown = document.getElementById(dropdownId) as HTMLDivElement;
  
  if (!input || !dropdown) return;

  const renderDropdown = (filtro: string = '') => {
    dropdown.innerHTML = '';
    const match = filtro.toLowerCase();
    const filtradas = categoriasDisponibles.filter(cat => cat.toLowerCase().includes(match));
    
    if (filtradas.length === 0) {
      dropdown.classList.add('hidden');
      return;
    }
    
    filtradas.forEach(cat => {
      const div = document.createElement('div');
      div.className = 'custom-dropdown-item';
      div.textContent = cat;
      div.addEventListener('click', () => {
        input.value = cat;
        dropdown.classList.add('hidden');
      });
      dropdown.appendChild(div);
    });
    dropdown.classList.remove('hidden');
  };

  input.addEventListener('focus', () => renderDropdown(input.value));
  input.addEventListener('input', () => renderDropdown(input.value));
  
  // Ocultar si hacemos clic fuera
  document.addEventListener('click', (e) => {
    if (!input.contains(e.target as Node) && !dropdown.contains(e.target as Node)) {
      dropdown.classList.add('hidden');
    }
  });
}

// Configurar dropdowns al inicio
configurarDropdown('prodCategoria', 'customCategorias');
configurarDropdown('editProdCategoria', 'customCategoriasEdit');

function abrirModalEdicion(p: any) {
  (document.getElementById('editProdId') as HTMLInputElement).value = p.id;
  (document.getElementById('editProdTitulo') as HTMLInputElement).value = p.titulo;
  (document.getElementById('editProdPrecio') as HTMLInputElement).value = p.precio;
  (document.getElementById('editProdCategoria') as HTMLInputElement).value = p.categoria;
  (document.getElementById('editProdImagen') as HTMLInputElement).value = p.imagenUrl || '';
  (document.getElementById('editProdDrive') as HTMLInputElement).value = p.driveUrl || '';
  (document.getElementById('editProdDesc') as HTMLTextAreaElement).value = p.descripcion || '';
  modalEdicion.classList.remove('hidden');
}

function cerrarModalEdicion() {
  modalEdicion.classList.add('hidden');
  editarProductoForm.reset();
}

async function manejarEdicionProducto(e: Event) {
  e.preventDefault();
  
  const id = (document.getElementById('editProdId') as HTMLInputElement).value;
    const productoEditado = {
      titulo: (document.getElementById('editProdTitulo') as HTMLInputElement).value.trim(),
      precio: Number((document.getElementById('editProdPrecio') as HTMLInputElement).value),
      categoria: (document.getElementById('editProdCategoria') as HTMLInputElement).value.trim(),
      imagenUrl: (document.getElementById('editProdImagen') as HTMLInputElement).value.trim(),
      driveUrl: (document.getElementById('editProdDrive') as HTMLInputElement).value.trim(),
      descripcion: (document.getElementById('editProdDesc') as HTMLTextAreaElement).value.trim()
    };

    const submitBtn = editarProductoForm.querySelector('button[type="submit"]') as HTMLButtonElement;
    const textOriginal = submitBtn.innerText;
    submitBtn.innerText = 'GUARDANDO...';
    submitBtn.disabled = true;

    try {
      const res = await fetch(`${API_URL}/admin/productos/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey
        },
        body: JSON.stringify(productoEditado)
      });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Error: ${res.status} - ${errorText}`);
    }

    cerrarModalEdicion();
    await cargarProductos();
  } catch (err: any) {
    alert(`Error al guardar cambios: ${err.message}`);
  }
}

// --- RENDER ---
function dibujarOrdenes(ordenes: any[]) {
  if (ordenes.length === 0) {
    ordenesBody.innerHTML = '<tr><td colspan="5">No hay órdenes registradas.</td></tr>';
    return;
  }

  ordenesBody.innerHTML = ordenes.map(orden => `
    <tr>
      <td>${orden.id.substring(0, 8)}</td>
      <td>${orden.emailCliente}</td>
      <td>$${Number(orden.total).toLocaleString('es-AR')}</td>
      <td><span class="status-badge status-${orden.estado}">${orden.estado}</span></td>
      <td>
        ${orden.estado === 'PENDIENTE' 
          ? `<button class="cyber-btn cyber-btn-sm btn-aprobar" data-id="${orden.id}">APROBAR</button>` 
          : `<span style="color:#666">PROCESADO</span>`}
      </td>
    </tr>
  `).join('');

  // Eventos para botones aprobar
  document.querySelectorAll('.btn-aprobar').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
      if (id) aprobarOrden(id, e.currentTarget as HTMLButtonElement);
    });
  });
}

function dibujarProductos(productos: any[]) {
  if (productos.length === 0) {
    productosBody.innerHTML = '<tr><td colspan="4">No hay productos.</td></tr>';
    return;
  }

  productosBody.innerHTML = productos.map(prod => `
    <tr>
      <td>${prod.titulo}</td>
      <td>$${Number(prod.precio).toLocaleString('es-AR')}</td>
      <td style="font-size:0.8rem">${prod.driveUrl || 'N/A'}</td>
      <td>
        <button style="margin-bottom: 0.5rem;" class="cyber-btn cyber-btn-sm btn-editar-prod" data-prod='${JSON.stringify(prod).replace(/'/g, "&apos;")}'>EDITAR</button>
        <button class="cyber-btn cyber-btn-sm cyber-btn-pink btn-eliminar-prod" data-id="${prod.id}">ELIMINAR</button>
      </td>
    </tr>
  `).join('');

  // Eventos para botones editar
  document.querySelectorAll('.btn-editar-prod').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const prodData = (e.currentTarget as HTMLElement).getAttribute('data-prod');
      if (prodData) {
        abrirModalEdicion(JSON.parse(prodData));
      }
    });
  });

  // Eventos para botones eliminar
  document.querySelectorAll('.btn-eliminar-prod').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
      if (id && confirm('¿Estás seguro de eliminar este producto?')) {
        eliminarProducto(id, e.currentTarget as HTMLButtonElement);
      }
    });
  });
}

// --- ACCIONES ---
async function aprobarOrden(ordenId: string, botonRef: HTMLButtonElement) {
  botonRef.disabled = true;
  botonRef.innerText = 'PROCESANDO...';
  
  try {
    const res = await fetch(`${API_URL}/admin/ordenes/aprobar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify({ ordenId })
    });

    if (!res.ok) throw new Error('Falló aprobación');
    
    // Recargar para ver estado actualizado
    cargarOrdenes();
  } catch (error) {
    alert('Error al aprobar orden');
    botonRef.disabled = false;
    botonRef.innerText = 'APROBAR';
  }
}

async function eliminarProducto(productoId: string, botonRef: HTMLButtonElement) {
  botonRef.disabled = true;
  botonRef.innerText = 'ELIMINANDO...';
  
  try {
    const res = await fetch(`${API_URL}/admin/productos/${productoId}`, {
      method: 'DELETE',
      headers: {
        'x-api-key': apiKey
      }
    });

    if (!res.ok) throw new Error('Falló eliminación');
    
    // Recargar tabla de productos
    cargarProductos();
  } catch (error) {
    alert('Error al eliminar producto');
    botonRef.disabled = false;
    botonRef.innerText = 'ELIMINAR';
  }
}
