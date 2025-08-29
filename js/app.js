import { setupAuthEventListeners } from './auth.js';
import { loadUserData, updateUserField, saveFullUserData } from './firestore.js';
import { showSaveFeedback, applyTheme } from './ui.js';

// --- Estado Global da Aplicação ---
let state = {
    currentUserId: null,
    profile: { name: '' },
    integrations: {
        whatsapp: { phoneNumberId: '', accessToken: '', webhookVerifyToken: '' }
    },
    creditCards: [],
    categories: [],
    recurringEntries: [],
    monthlyData: {},
    activeMonthIndex: new Date().getMonth(),
    chartInstances: {},
    saveTimeout: null
};

// --- Constantes ---
const constants = {
    monthNames: ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro", "Balanço Anual"],
    basePaymentMethods: ['Pix', 'Débito', 'Crédito', 'Dinheiro', 'Outro']
};


// --- Lógica Principal ---

function debounce(func, delay) {
    return (...args) => {
        clearTimeout(state.saveTimeout);
        state.saveTimeout = setTimeout(() => {
            func.apply(this, args);
            showSaveFeedback();
        }, delay);
    };
}

const debouncedUpdateField = debounce(updateUserField, 1000);

function formatCurrency(value) {
    return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

function showMonth(monthIndex) {
    state.activeMonthIndex = monthIndex;
    // ... (A maior parte da lógica de `showMonth` original vai aqui,
    // adaptada para usar o `state` global) ...

    // Por simplicidade, a lógica de renderização complexa ainda está aqui.
    // O ideal seria movê-la para ui.js
    console.log(`Mostrando mês: ${constants.monthNames[monthIndex]}`);
    document.querySelectorAll('.month-content').forEach(c => c.classList.remove('active'));
    // Lógica para renderizar abas, tabelas, gráficos, etc.
}

async function handleLogin(user) {
    state.currentUserId = user.uid;
    const userData = await loadUserData(user.uid);
    
    // Mescla os dados carregados com o estado inicial para garantir que todos os campos existam
    Object.assign(state, userData);
    
    // Garante que os 12 meses existem no objeto de dados
    for (let i = 0; i < 12; i++) {
        if (!state.monthlyData[i]) {
            state.monthlyData[i] = { 
                pjEntries: [], 
                pfEntries: [], 
                expenses: Array(31).fill(null).map(() => ({ personalEntries: [], businessEntries: [] })) 
            };
        }
    }

    // Inicializa a UI com os dados carregados
    initializeAppUI();
}

function handleLogout() {
    state.currentUserId = null;
    // Limpa o estado se necessário
}

function initializeAppUI() {
    const loadingOverlay = document.getElementById('loading-overlay');
    
    // Renderiza o conteúdo inicial
    const monthContentContainer = document.getElementById('monthContentContainer');
    monthContentContainer.innerHTML = ''; // Limpa o conteúdo antigo
    constants.monthNames.forEach((_, index) => {
        // A função que cria o HTML do mês precisa ser definida ou importada
        // monthContentContainer.insertAdjacentHTML('beforeend', createMonthContentHTML(index));
    });
    
    showMonth(state.activeMonthIndex);
    loadingOverlay.classList.add('hidden');
}


function bindGlobalEventListeners() {
    document.getElementById('theme-toggle-btn').addEventListener('click', () => {
        const newTheme = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
        localStorage.setItem('theme', newTheme);
        applyTheme(newTheme);
        // Re-renderiza gráficos se necessário, pois as cores podem mudar
        showMonth(state.activeMonthIndex); 
    });

    // --- Exemplo de como um evento de input seria refatorado ---
    document.body.addEventListener('input', (event) => {
        const target = event.target;

        if (target.matches('.entry-input')) {
            const el = target.closest('.flex');
            const btn = el.querySelector('.remove-btn');
            if (!btn) return;

            const { monthIndex, type, day, category, entryId } = btn.dataset;
            const id = parseFloat(entryId);
            const field = target.dataset.field;
            let value = target.value;
            
            // Validação simples
            if (field === 'amount') {
                value = parseFloat(value) || 0;
                if (value < 0) value = 0; // Não permitir valores negativos
            }

            // Atualiza o estado local (otimista)
            let entryList;
            if (type === 'pj') entryList = state.monthlyData[monthIndex].pjEntries;
            else if (type === 'pf') entryList = state.monthlyData[monthIndex].pfEntries;
            else entryList = state.monthlyData[monthIndex].expenses[day][`${category}Entries`];

            const entry = entryList.find(e => e.id === id);
            if (entry) {
                entry[field] = value;
            }
            
            // Recalcula totais na UI
            // recalculateAndDisplayTotals(monthIndex);

            // Envia a atualização para o Firestore de forma granular e com debounce
            const path = `monthlyData.${monthIndex}.pjEntries`; // Exemplo de caminho
            // A lógica para construir o `path` correto precisa ser implementada aqui.
            // debouncedUpdateField(state.currentUserId, path, entryList);
        }
    });
}

// --- Ponto de Entrada da Aplicação ---
function main() {
    // Aplica o tema salvo
    applyTheme(localStorage.getItem('theme') || 'light');
    
    // Configura os listeners de autenticação, passando as funções de callback
    setupAuthEventListeners(handleLogin, handleLogout);
    
    // Configura outros listeners globais da aplicação
    bindGlobalEventListeners();
}

// Inicia a aplicação
main();
