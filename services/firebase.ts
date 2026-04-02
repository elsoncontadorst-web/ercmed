import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics"; // IMPORTADO: Necessário para a linha const analytics = getAnalytics(app);
import {
  getAuth,
  signInWithEmailAndPassword as firebaseSignIn,
  createUserWithEmailAndPassword as firebaseCreateUser,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  User
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
// Inicializa o Analytics com tratamento de erro para IndexedDB
try {
  const analytics = getAnalytics(app);
} catch (error) {
  console.warn('Firebase Analytics não pôde ser inicializado (IndexedDB indisponível):', error);
  // Analytics é opcional - a aplicação continua funcionando sem ele
}

// INICIALIZAÇÃO RESTAURADA: ESSENCIAL para as funções de login e assinatura (db) abaixo
export const auth = getAuth(app);
// Inicializa o Firestore com ignoreUndefinedProperties: true para evitar erros com campos opcionais
export const db = initializeFirestore(app, { ignoreUndefinedProperties: true });
// Inicializa o Firebase Storage
export const storage = getStorage(app);

// Exporta funções wrapper para facilitar o uso no React
export const signInWithEmailAndPassword = firebaseSignIn;
export const createUserWithEmailAndPassword = firebaseCreateUser;
export const signOut = firebaseSignOut;
export const onAuthStateChanged = firebaseOnAuthStateChanged;
export const sendPasswordResetEmail = firebaseSendPasswordResetEmail;

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