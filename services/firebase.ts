import { deleteApp, initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics"; // IMPORTADO: Necessário para a linha const analytics = getAnalytics(app);
import {
  getAuth,
  signInWithEmailAndPassword as firebaseSignIn,
  createUserWithEmailAndPassword as firebaseCreateUser,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup as firebaseSignInWithPopup,
  linkWithCredential,
  fetchSignInMethodsForEmail,
  EmailAuthProvider,
  User,
  browserLocalPersistence,
  setPersistence
} from "firebase/auth";
import {
  getFirestore,
  initializeFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp
} from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";
import { getAI, GoogleAIBackend } from "firebase/ai";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";

// --- CONFIGURAÇÃO DO FIREBASE ---
// Agora apontando para o seu novo projeto easymed-1fb06
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
const recaptchaEnterpriseSiteKey = import.meta.env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY;
const appCheckEnabled = import.meta.env.VITE_ENABLE_APP_CHECK === 'true';
if (appCheckEnabled && recaptchaEnterpriseSiteKey) {
  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(recaptchaEnterpriseSiteKey),
    isTokenAutoRefreshEnabled: true
  });
}
// Inicializa o Analytics com tratamento de erro para IndexedDB
try {
  const analytics = getAnalytics(app);
} catch (error) {
  console.warn('Firebase Analytics não pôde ser inicializado (IndexedDB indisponível):', error);
  // Analytics é opcional - a aplicação continua funcionando sem ele
}

// INICIALIZAÇÃO RESTAURADA: ESSENCIAL para as funções de login e assinatura (db) abaixo
export const auth = getAuth(app);
// Mantém a sessão entre recarregamentos e reaberturas do navegador. A sessão
// só é encerrada por signOut (ou por revogação de segurança no Firebase).
export const authPersistenceReady = setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.warn('Não foi possível ativar a persistência local da sessão:', error);
});
// Inicializa o Firestore com ignoreUndefinedProperties: true para evitar erros com campos opcionais
export const db = initializeFirestore(app, { ignoreUndefinedProperties: true });
// Inicializa o Firebase Storage
export const storage = getStorage(app);
// Functions is initialized only when a feature actually needs it. Initializing it
// eagerly can prevent the entire application from rendering when the Functions
// provider is unavailable during local dependency pre-bundling.
export const getCloudFunctions = () => getFunctions(app, "us-central1");
export const clinicalAI = getAI(app, { backend: new GoogleAIBackend() });

// Exporta funções wrapper para facilitar o uso no React
export const signInWithEmailAndPassword = async (...args: Parameters<typeof firebaseSignIn>) => {
  await authPersistenceReady;
  return firebaseSignIn(...args);
};
export const createUserWithEmailAndPassword = async (...args: Parameters<typeof firebaseCreateUser>) => {
  await authPersistenceReady;
  return firebaseCreateUser(...args);
};
export const signOut = firebaseSignOut;
export const onAuthStateChanged = firebaseOnAuthStateChanged;
export const sendPasswordResetEmail = firebaseSendPasswordResetEmail;

// Create a managed account without replacing the administrator's session.
export const createManagedAuthUser = async (email: string, password: string) => {
  const secondaryApp = initializeApp(firebaseConfig, `managed-user-${Date.now()}`);
  try {
    return await firebaseCreateUser(getAuth(secondaryApp), email, password);
  } finally {
    await deleteApp(secondaryApp);
  }
};

export const googleProvider = new GoogleAuthProvider();
export const signInWithPopup = async (...args: Parameters<typeof firebaseSignInWithPopup>) => {
  await authPersistenceReady;
  return firebaseSignInWithPopup(...args);
};
export { linkWithCredential, fetchSignInMethodsForEmail, EmailAuthProvider, GoogleAuthProvider };

// --- FUNÇÕES DE ASSINATURA (FIRESTORE) ---

export interface UserSubscription {
  status: 'active' | 'inactive' | 'pending';
  planType?: 'monthly' | 'semiannual' | 'annual';
  lastPaymentDate?: any;
  createdAt?: any;
}

export const getUserSubscription = async (uid: string): Promise<UserSubscription | null> => {
  try {
    // Agora usa a instância 'db' corretamente exportada acima
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      return userSnap.data() as UserSubscription;
    } else {
      return null;
    }
  } catch (error) {
    console.error("Erro ao buscar assinatura:", error);
    return null;
  }
};

export const updateUserSubscription = async (uid: string, data: Partial<UserSubscription>) => {
  try {
    // Agora usa a instância 'db' corretamente exportada acima
    const userRef = doc(db, "users", uid);
    // Usa setDoc com merge: true para criar se não existir ou atualizar se existir
    await setDoc(userRef, {
      ...data,
      updatedAt: serverTimestamp()
    }, { merge: true });
    return true;
  } catch (error) {
    console.error("Erro ao atualizar assinatura:", error);
    return false;
  }
};

// Re-exporta o tipo User
export type { User };
