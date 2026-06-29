import {
  deleteProduct,
  isFirebaseReady,
  onAdminStateChanged,
  saveProduct,
  signInAdmin,
  signOutAdmin,
  watchProducts
} from "./firebase-service.js";

const setupAlert = document.querySelector("#setupAlert");
const loginForm = document.querySelector("#loginForm");
const dashboard = document.querySelector("#dashboard");
const logoutButton = document.querySelector("#logoutButton");
const productForm = document.querySelector("#productForm");
const photoInput = document.querySelector("#photo");
const photoName = document.querySelector("#photoName");
const photoPreview = document.querySelector("#photoPreview");
const saveButton = document.querySelector("#saveButton");
const saveMessage = document.querySelector("#saveMessage");
const loginMessage = document.querySelector("#loginMessage");
const adminProducts = document.querySelector("#adminProducts");

let productsLoaded = false;

if (!isFirebaseReady()) {
  setupAlert.hidden = false;
  loginForm.hidden = true;
} else {
  setupAuth();
}

photoInput.addEventListener("change", () => {
  const file = photoInput.files[0];
  if (!file) {
    photoName.textContent = "Escolher imagem";
    photoPreview.removeAttribute("src");
    return;
  }

  photoName.textContent = file.name;
  const reader = new FileReader();
  reader.onload = () => {
    photoPreview.src = reader.result;
  };
  reader.readAsDataURL(file);
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginMessage.textContent = "A entrar...";

  try {
    await signInAdmin(
      document.querySelector("#adminEmail").value.trim(),
      document.querySelector("#adminPassword").value
    );
    loginMessage.textContent = "";
  } catch (error) {
    loginMessage.textContent = "Nao foi possivel entrar. Confirme email e senha.";
    console.error(error);
  }
});

logoutButton.addEventListener("click", () => {
  signOutAdmin();
});

productForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  saveButton.disabled = true;
  saveMessage.textContent = "A guardar produto...";

  try {
    const product = {
      name: document.querySelector("#name").value.trim(),
      category: document.querySelector("#category").value,
      price: document.querySelector("#price").value.trim(),
      sizes: document.querySelector("#sizes").value.trim(),
      description: document.querySelector("#description").value.trim()
    };

    await saveProduct(product, photoInput.files[0]);
    productForm.reset();
    photoName.textContent = "Escolher imagem";
    photoPreview.removeAttribute("src");
    saveMessage.textContent = "Produto guardado com sucesso.";
  } catch (error) {
    saveMessage.textContent = "Erro ao guardar. Verifique a configuracao do Firebase.";
    console.error(error);
  } finally {
    saveButton.disabled = false;
  }
});

async function setupAuth() {
  await onAdminStateChanged((user) => {
    const isLoggedIn = Boolean(user);
    loginForm.hidden = isLoggedIn;
    dashboard.hidden = !isLoggedIn;
    logoutButton.hidden = !isLoggedIn;

    if (isLoggedIn && !productsLoaded) {
      productsLoaded = true;
      watchProducts(renderAdminProducts);
    }
  });
}

function renderAdminProducts(products) {
  adminProducts.innerHTML = "";

  if (!products.length) {
    adminProducts.innerHTML = `<p class="empty-state">Ainda nao existem produtos online.</p>`;
    return;
  }

  products.forEach((product) => {
    const item = document.createElement("article");
    item.className = "admin-product-item";
    item.innerHTML = `
      <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}">
      <div>
        <strong>${escapeHtml(product.name)}</strong>
        <span>${escapeHtml(product.category)} - ${escapeHtml(product.price)}</span>
      </div>
      <button class="secondary-button compact" type="button">Remover</button>
    `;

    item.querySelector("button").addEventListener("click", async () => {
      const confirmed = confirm(`Remover ${product.name}?`);
      if (!confirmed) {
        return;
      }

      await deleteProduct(product.id);
    });

    adminProducts.append(item);
  });
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
