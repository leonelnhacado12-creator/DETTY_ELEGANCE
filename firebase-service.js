import { firebaseConfig } from "./firebase-config.js?v=8";

const FIREBASE_VERSION = "10.12.4";

let appModulesPromise;
let unsubscribeProducts;

export function isFirebaseReady() {
  return firebaseConfig.apiKey && firebaseConfig.apiKey !== "COLOQUE_AQUI";
}

export async function signInAdmin(email, password) {
  const { auth, signInWithEmailAndPassword } = await loadFirebase();
  return signInWithEmailAndPassword(auth, email, password);
}

export async function signOutAdmin() {
  const { auth, signOut } = await loadFirebase();
  return signOut(auth);
}

export async function onAdminStateChanged(callback) {
  const { auth, onAuthStateChanged } = await loadFirebase();
  return onAuthStateChanged(auth, callback);
}

export async function watchProducts(callback) {
  const { db, collection, onSnapshot, orderBy, query } = await loadFirebase();
  const productsQuery = query(collection(db, "products"), orderBy("createdAt", "desc"));

  if (unsubscribeProducts) {
    unsubscribeProducts();
  }

  unsubscribeProducts = onSnapshot(productsQuery, (snapshot) => {
    const products = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    callback(products);
  });

  return unsubscribeProducts;
}

export async function saveProduct(product, imageFile) {
  const {
    db,
    storage,
    addDoc,
    collection,
    getDownloadURL,
    ref,
    serverTimestamp,
    uploadBytes
  } = await loadFirebase();

  let image = product.image || fallbackProductImage(product.name);

  if (imageFile && !product.image) {
    const extension = imageFile.name.split(".").pop() || "jpg";
    const filePath = `products/${Date.now()}-${crypto.randomUUID()}.${extension}`;
    const storageRef = ref(storage, filePath);
    await uploadBytes(storageRef, imageFile);
    image = await getDownloadURL(storageRef);
  }

  return addDoc(collection(db, "products"), {
    ...product,
    image,
    createdAt: serverTimestamp()
  });
}

function fallbackProductImage(label) {
  const safeLabel = String(label || "Produto")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
    .slice(0, 18);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="720" height="860" viewBox="0 0 720 860">
      <rect width="720" height="860" fill="#f7eadc"/>
      <circle cx="540" cy="170" r="82" fill="#d79b24" opacity=".72"/>
      <rect x="145" y="160" width="430" height="520" rx="34" fill="#fffaf4" opacity=".92"/>
      <path d="M222 590c88-134 174-132 258 0" fill="none" stroke="#b8325f" stroke-width="34" stroke-linecap="round"/>
      <circle cx="280" cy="360" r="54" fill="#b8325f" opacity=".92"/>
      <circle cx="436" cy="360" r="54" fill="#2f6f5e" opacity=".9"/>
      <text x="360" y="735" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="48" font-weight="800" fill="#191817">${safeLabel}</text>
    </svg>
  `;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export async function deleteProduct(productId) {
  const { db, deleteDoc, doc } = await loadFirebase();
  return deleteDoc(doc(db, "products", productId));
}

async function loadFirebase() {
  if (!isFirebaseReady()) {
    throw new Error("Firebase ainda nao foi configurado.");
  }

  if (!appModulesPromise) {
    appModulesPromise = Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-storage.js`)
    ]).then(([appModule, authModule, firestoreModule, storageModule]) => {
      const app = appModule.initializeApp(firebaseConfig);
      const auth = authModule.getAuth(app);
      const db = firestoreModule.getFirestore(app);
      const storage = storageModule.getStorage(app);

      return {
        auth,
        db,
        storage,
        addDoc: firestoreModule.addDoc,
        collection: firestoreModule.collection,
        deleteDoc: firestoreModule.deleteDoc,
        doc: firestoreModule.doc,
        getDownloadURL: storageModule.getDownloadURL,
        onAuthStateChanged: authModule.onAuthStateChanged,
        onSnapshot: firestoreModule.onSnapshot,
        orderBy: firestoreModule.orderBy,
        query: firestoreModule.query,
        ref: storageModule.ref,
        serverTimestamp: firestoreModule.serverTimestamp,
        signInWithEmailAndPassword: authModule.signInWithEmailAndPassword,
        signOut: authModule.signOut,
        uploadBytes: storageModule.uploadBytes
      };
    });
  }

  return appModulesPromise;
}
