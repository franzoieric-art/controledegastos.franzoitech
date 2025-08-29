import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut,
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { auth } from './config.js';

const authScreen = document.getElementById('auth-screen');
const appScreen = document.getElementById('app-screen');
const loadingOverlay = document.getElementById('loading-overlay');

let isLoginMode = true;

const showError = (message) => {
    document.getElementById('auth-error').textContent = message;
};

const setAuthMode = (mode) => {
    isLoginMode = mode === 'login';
    document.getElementById('auth-error').textContent = '';
    const authTitle = document.getElementById('auth-title');
    const confirmPasswordInput = document.getElementById('confirm-password-input');
    const mainAuthBtn = document.getElementById('main-auth-btn');
    const forgotPasswordLink = document.getElementById('forgot-password-link');
    const toggleAuthModeLink = document.getElementById('toggle-auth-mode-link');

    if (isLoginMode) {
        authTitle.textContent = 'Acesso ao Painel';
        mainAuthBtn.textContent = 'Entrar';
        confirmPasswordInput.classList.add('hidden');
        forgotPasswordLink.classList.remove('hidden');
        toggleAuthModeLink.innerHTML = 'Ainda não tem conta? Crie uma, <span class="font-semibold">é grátis!</span>';
    } else {
        authTitle.textContent = 'Criar Nova Conta';
        mainAuthBtn.textContent = 'Criar Conta';
        confirmPasswordInput.classList.remove('hidden');
        forgotPasswordLink.classList.add('hidden');
        toggleAuthModeLink.textContent = 'Já tem conta? Faça login';
    }
};

const handleAuthAction = () => {
    const email = document.getElementById('email-input').value;
    const password = document.getElementById('password-input').value;
    const mainAuthBtn = document.getElementById('main-auth-btn');

    // Validação básica
    if (!email || !password) {
        showError("Por favor, preencha email e senha.");
        return;
    }
    
    showError('');
    const originalBtnText = mainAuthBtn.textContent;
    mainAuthBtn.disabled = true;
    mainAuthBtn.textContent = 'Aguarde...';
    
    const restoreBtn = () => {
        mainAuthBtn.disabled = false;
        mainAuthBtn.textContent = originalBtnText;
    };

    if (isLoginMode) {
        signInWithEmailAndPassword(auth, email, password)
            .catch(error => {
                showError('Email ou senha inválidos.');
                restoreBtn();
            });
    } else {
        const confirmPassword = document.getElementById('confirm-password-input').value;
        if (password !== confirmPassword) {
            showError('As senhas não coincidem.');
            restoreBtn();
            return;
        }
        if (password.length < 6) {
             showError('A senha deve ter pelo menos 6 caracteres.');
             restoreBtn();
             return;
        }
        createUserWithEmailAndPassword(auth, email, password)
            .catch(error => {
                if (error.code === 'auth/email-already-in-use') {
                    showError('Este email já está em uso.');
                } else {
                    showError('Erro ao criar conta.');
                }
                restoreBtn();
            });
    }
};

export function setupAuthEventListeners(onLogin, onLogout) {
    onAuthStateChanged(auth, user => {
        if (user) {
            authScreen.classList.add('hidden');
            appScreen.classList.remove('hidden');
            loadingOverlay.classList.remove('hidden');
            onLogin(user);
        } else {
            setAuthMode('login');
            authScreen.classList.remove('hidden');
            appScreen.classList.add('hidden');
            loadingOverlay.classList.add('hidden');
            onLogout();
        }
    });

    document.getElementById('main-auth-btn').addEventListener('click', handleAuthAction);
    document.getElementById('toggle-auth-mode-link').addEventListener('click', (e) => {
        e.preventDefault();
        setAuthMode(isLoginMode ? 'signup' : 'login');
    });

    document.getElementById('logout-btn').addEventListener('click', () => signOut(auth));
    
    document.getElementById('forgot-password-link').addEventListener('click', (e) => {
        e.preventDefault();
        const email = document.getElementById('email-input').value;
        if (!email) {
            showError('Por favor, insira seu email para recuperar a senha.');
            return;
        }
        sendPasswordResetEmail(auth, email)
            .then(() => { showError('Email de recuperação enviado!'); })
            .catch((error) => { showError('Não foi possível enviar o email.'); });
    });

    // Adiciona listener para a tecla 'Enter'
    const handleAuthKeyPress = (event) => { if (event.key === 'Enter') { event.preventDefault(); handleAuthAction(); } };
    document.getElementById('email-input').addEventListener('keydown', handleAuthKeyPress);
    document.getElementById('password-input').addEventListener('keydown', handleAuthKeyPress);
    document.getElementById('confirm-password-input').addEventListener('keydown', handleAuthKeyPress);
}
