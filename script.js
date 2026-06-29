const STORAGE_KEY = "detty-elegance-products";

const defaultProducts = [
  {
    id: newId(),
    name: "Vestido elegante",
    category: "Roupas",
    price: "850 MT",
    sizes: "P, M, G",
    description: "Vestido bonito para saidas, festas e uso especial.",
    image: productSvg("Vestido", "#b8325f", "#f4d6d0")
  },
  {
    id: newId(),
    name: "Colar delicado",
    category: "Bijuterias",
    price: "250 MT",
    sizes: "Dourado",
    description: "Colar leve para combinar com varios estilos.",
    image: productSvg("Colar", "#d79b24", "#fff1d4")
  },
  {
    id: newId(),
    name: "Capa personalizada",
    category: "Capas de celular",
    price: "350 MT",
    sizes: "Samsung, iPhone, Tecno",
    description: "Capa simples ou personalizada conforme o modelo do telefone.",
    image: productSvg("Capa", "#2f6f5e", "#d8ede7")
  },
  {
    id: newId(),
    name: "Airpods",
    category: "Airpods",
    price: "1.200 MT",
    sizes: "Bluetooth",
    description: "Auscultadores sem fio. Confirme disponibilidade pelo WhatsApp.",
    image: productSvg("Airpods", "#191817", "#ece7df")
  }
];

let products = loadProducts();
let activeCategory = "Todos";
let imageData = "";

const grid = document.querySelector("#productGrid");
const filters = document.querySelector("#categoryFilters");
const searchInput = document.querySelector("#searchInput");
const emptyState = document.querySelector("#emptyState");
const adminDialog = document.querySelector("#adminDialog");
const productForm = document.querySelector("#productForm");
const photoInput = document.querySelector("#photo");
const photoPreview = document.querySelector("#photoPreview");
const photoName = document.querySelector("#photoName");

document.querySelector("#openAdmin").addEventListener("click", () => adminDialog.showModal());
document.querySelector("#closeAdmin").addEventListener("click", () => adminDialog.close());
document.querySelector("#exportProducts").addEventListener("click", exportProducts);
searchInput.addEventListener("input", renderProducts);

photoInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) {
    return;
  }

  photoName.textContent = file.name;
  const reader = new FileReader();
  reader.onload = () => {
    imageData = reader.result;
    photoPreview.src = imageData;
  };
  reader.readAsDataURL(file);
});

productForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const product = {
    id: newId(),
    name: document.querySelector("#name").value.trim(),
    category: document.querySelector("#category").value,
    price: document.querySelector("#price").value.trim(),
    sizes: document.querySelector("#sizes").value.trim(),
    description: document.querySelector("#description").value.trim(),
    image: imageData || productSvg(document.querySelector("#name").value.trim(), "#b8325f", "#f7eadc")
  };

  products = [product, ...products];
  saveProducts();
  productForm.reset();
  imageData = "";
  photoPreview.removeAttribute("src");
  photoName.textContent = "Escolher imagem";
  adminDialog.close();
  renderFilters();
  renderProducts();
});

renderFilters();
renderProducts();

function loadProducts() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return defaultProducts;
  }

  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) && parsed.length ? parsed : defaultProducts;
  } catch {
    return defaultProducts;
  }
}

function saveProducts() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
}

function renderFilters() {
  const categories = ["Todos", ...new Set(products.map((product) => product.category))];
  filters.innerHTML = "";

  categories.forEach((category) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = category;
    button.className = category === activeCategory ? "active" : "";
    button.addEventListener("click", () => {
      activeCategory = category;
      renderFilters();
      renderProducts();
    });
    filters.append(button);
  });
}

function renderProducts() {
  const query = searchInput.value.trim().toLowerCase();
  const visibleProducts = products.filter((product) => {
    const matchesCategory = activeCategory === "Todos" || product.category === activeCategory;
    const text = `${product.name} ${product.category} ${product.price} ${product.sizes} ${product.description}`.toLowerCase();
    return matchesCategory && text.includes(query);
  });

  grid.innerHTML = "";
  emptyState.hidden = visibleProducts.length > 0;

  visibleProducts.forEach((product) => {
    const card = document.createElement("article");
    card.className = "product-card";

    const message = encodeURIComponent(`Ola DETTY ELEGANCE, tenho interesse neste artigo: ${product.name} - ${product.price}. Tamanhos/modelos: ${product.sizes || "a confirmar"}.`);

    card.innerHTML = `
      <img src="${product.image}" alt="${escapeHtml(product.name)}">
      <div class="product-body">
        <span class="tag">${escapeHtml(product.category)}</span>
        <div class="product-meta">
          <h3>${escapeHtml(product.name)}</h3>
          <span class="price">${escapeHtml(product.price)}</span>
        </div>
        <p><strong>Tamanhos/modelos:</strong> ${escapeHtml(product.sizes || "A confirmar")}</p>
        <p>${escapeHtml(product.description || "Entre em contacto para mais detalhes.")}</p>
        <a class="buy-button" href="https://wa.me/258868824595?text=${message}" target="_blank" rel="noreferrer">Pedir no WhatsApp</a>
      </div>
    `;

    grid.append(card);
  });
}

function exportProducts() {
  const data = JSON.stringify(products, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "catalogo-detty-elegance.json";
  link.click();
  URL.revokeObjectURL(url);
}

function productSvg(label, color, background) {
  const text = escapeHtml(label.slice(0, 18));
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="720" height="860" viewBox="0 0 720 860">
      <rect width="720" height="860" fill="${background}"/>
      <circle cx="540" cy="170" r="82" fill="#d79b24" opacity=".72"/>
      <rect x="145" y="160" width="430" height="520" rx="34" fill="#fffaf4" opacity=".92"/>
      <path d="M222 590c88-134 174-132 258 0" fill="none" stroke="${color}" stroke-width="34" stroke-linecap="round"/>
      <circle cx="280" cy="360" r="54" fill="${color}" opacity=".92"/>
      <circle cx="436" cy="360" r="54" fill="#2f6f5e" opacity=".9"/>
      <text x="360" y="735" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="48" font-weight="800" fill="#191817">${text}</text>
    </svg>
  `;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function newId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `product-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
