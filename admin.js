import {
  deleteProduct,
  isFirebaseReady,
  onAdminStateChanged,
  saveProduct,
  signInAdmin,
  signOutAdmin,
  watchProducts
} from "./firebase-service.js?v=8";

const setupAlert = document.querySelector("#setupAlert");
const loginForm = document.querySelector("#loginForm");
const dashboard = document.querySelector("#dashboard");
const logoutButton = document.querySelector("#logoutButton");
const productForm = document.querySelector("#productForm");
const photoInput = document.querySelector("#photo");
const imageUrlInput = document.querySelector("#imageUrl");
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
    photoName.textContent = "Opcional: escolher imagem";
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

imageUrlInput.addEventListener("input", () => {
  const imageUrl = imageUrlInput.value.trim();
  if (!imageUrl) {
    if (!photoInput.files[0]) {
      photoPreview.removeAttribute("src");
    }
    saveMessage.textContent = "";
    return;
  }

  if (!isValidImageUrl(imageUrl)) {
    saveMessage.textContent = "Use um link publico da foto, comecando por https://, ou um caminho do site como imagens/foto.jpg.";
    photoPreview.removeAttribute("src");
    return;
  }

  photoPreview.src = imageUrl;
  photoPreview.onerror = () => {
    saveMessage.textContent = "Esta foto nao abriu. No celular, use um link publico direto da imagem.";
  };
  photoPreview.onload = () => {
    saveMessage.textContent = "";
  };
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
    loginMessage.textContent = loginErrorMessage(error);
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
      description: document.querySelector("#description").value.trim(),
      image: imageUrlInput.value.trim()
    };

    if (product.image) {
      if (!isValidImageUrl(product.image)) {
        throw new Error("INVALID_IMAGE_URL");
      }

      await assertImageLoads(product.image);
    }

    await withTimeout(saveProduct(product, photoInput.files[0]), 15000);
    productForm.reset();
    photoName.textContent = "Opcional: escolher imagem";
    photoPreview.removeAttribute("src");
    saveMessage.textContent = "Produto guardado com sucesso.";
  } catch (error) {
    saveMessage.textContent = saveErrorMessage(error);
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

    item.querySelector("img").addEventListener("error", (event) => {
      event.currentTarget.src = fallbackAdminImage(product.name);
    });

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

function loginErrorMessage(error) {
  const messages = {
    "auth/invalid-credential": "Email ou senha incorretos.",
    "auth/invalid-email": "Email invalido.",
    "auth/user-not-found": "Este email nao existe nos usuarios do Firebase.",
    "auth/wrong-password": "Senha incorreta.",
    "auth/operation-not-allowed": "Ative o metodo E-mail/senha no Firebase Authentication.",
    "auth/unauthorized-domain": "Autorize o dominio leonelnhacado12-creator.github.io no Firebase Authentication."
  };

  return messages[error.code] || `Nao foi possivel entrar: ${error.code || "erro desconhecido"}.`;
}

function saveErrorMessage(error) {
  if (error.message === "INVALID_IMAGE_URL") {
    return "Link da foto invalido. Use https://... da imagem ou imagens/nome-da-foto.jpg se a foto estiver no site.";
  }

  if (error.message === "IMAGE_NOT_LOADING") {
    return "A foto nao abriu. No celular, copie um link publico direto da imagem, nao o link da pagina.";
  }

  const messages = {
    "permission-denied": "Sem permissao para guardar. Verifique as regras do Firestore.",
    "unavailable": "Firebase indisponivel. Tente novamente.",
    "deadline-exceeded": "Demorou muito para guardar. Verifique internet e regras do Firestore.",
    "storage/unauthorized": "Sem permissao para enviar foto. Use link da foto em vez de ficheiro."
  };

  return messages[error.code] || `Erro ao guardar: ${error.code || error.message || "erro desconhecido"}.`;
}

function isValidImageUrl(value) {
  return /^(https?:\/\/|data:image\/|imagens\/|\.\/imagens\/)/i.test(value);
}

function assertImageLoads(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = resolve;
    image.onerror = () => reject(new Error("IMAGE_NOT_LOADING"));
    image.src = src;
  });
}

function withTimeout(promise, timeoutMs) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => {
        const error = new Error("Tempo limite ao guardar.");
        error.code = "deadline-exceeded";
        reject(error);
      }, timeoutMs);
    })
  ]);
}

function fallbackAdminImage(label) {
  const safeLabel = escapeHtml(String(label || "Produto").slice(0, 18));
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
      <rect width="120" height="120" fill="#f7eadc"/>
      <circle cx="84" cy="28" r="14" fill="#d79b24" opacity=".72"/>
      <rect x="24" y="26" width="72" height="64" rx="10" fill="#fffaf4"/>
      <path d="M35 77c18-26 34-26 50 0" fill="none" stroke="#b8325f" stroke-width="8" stroke-linecap="round"/>
      <text x="60" y="108" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="11" font-weight="700" fill="#191817">${safeLabel}</text>
    </svg>
  `;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
