
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Configurações reais fornecidas pelo usuário
export const firebaseConfig = {
  apiKey: "AIzaSyC3BY7Q57Ce7ZDzqacPJlF4Wbxq0vTWHM8",
  authDomain: "ompro-d6209.firebaseapp.com",
  projectId: "ompro-d6209",
  storageBucket: "ompro-d6209.firebasestorage.app",
  messagingSenderId: "37172530584",
  appId: "1:37172530584:web:702cf52b43b6b6c9942fed"
};

// Inicialização do Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
