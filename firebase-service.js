import { firebaseConfig } from "./firebase-config.js";

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

  let image = product.image || "";

  if (imageFile) {
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
