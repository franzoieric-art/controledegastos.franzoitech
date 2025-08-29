import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// !!! ATENÇÃO: RISCO DE SEGURANÇA !!!
// Em um ambiente de produção, NUNCA exponha essas chaves diretamente no código do cliente.
// Use variáveis de ambiente e um processo de build (ex: Vite, Webpack) ou
// autentique-se através de um backend (ex: Firebase Cloud Functions).

const firebaseConfig = {
    apiKey: "SUA_API_KEY_AQUI", // Substitua com seus valores
    authDomain: "SEU_AUTH_DOMAIN_AQUI",
    projectId: "SEU_PROJECT_ID_AQUI",
    storageBucket: "SEU_STORAGE_BUCKET_AQUI",
    messagingSenderId: "SEU_SENDER_ID_AQUI",
    appId: "SEU_APP_ID_AQUI"
};

// Inicializa o Firebase e exporta as instâncias
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
