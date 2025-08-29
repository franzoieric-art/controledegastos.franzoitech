import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// !!! ATENÇÃO: RISCO DE SEGURANÇA !!!
// Em um ambiente de produção, NUNCA exponha essas chaves diretamente no código do cliente.
// Use variáveis de ambiente e um processo de build (ex: Vite, Webpack) ou
// autentique-se através de um backend (ex: Firebase Cloud Functions).

const firebaseConfig = {
    apiKey: "AIzaSyApSIolaeRxXdVNsnZkAvz_F_ILmxs1_K0",
    authDomain: "AIzaSyApSIolaeRxXdVNsnZkAvz_F_ILmxs1_K0",
    projectId: "controle-de-gastos-74daf",
    storageBucket: "controle-de-gastos-74daf.firebasestorage.app",
    messagingSenderId: "331667008487",
    appId: "1:331667008487:web:c5200f64ac27d0c32feb42",
};

// Inicializa o Firebase e exporta as instâncias
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
