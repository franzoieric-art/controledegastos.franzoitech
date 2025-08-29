// js/app.js - VERSÃO COM CORREÇÃO DE ESCOPO E INICIALIZAÇÃO

import { setupAuthEventListeners } from './auth.js';
import { loadUserData, updateUserField } from './firestore.js';
import { showSaveFeedback, applyTheme } from './ui.js';

let state = {
    currentUserId: null,
    profile: { name: '' },
    integrations: { whatsapp: { phoneNumberId: '', accessToken: '', webhookVerifyToken: '' } },
    creditCards: [],
    categories: [],
    recurringEntries: [],
    monthlyData: {},
    activeMonthIndex: new Date().getMonth(),
    chartInstances: {},
    saveTimeout: null
};

const constants = {
    monthNames: ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro", "Balanço Anual"],
    basePaymentMethods: ['Pix', 'Débito', 'Crédito', 'Dinheiro', 'Outro']
};

const helpers = {
    formatCurrency: (value) => {
        if (typeof value !== 'number') value = 0;
        return `R$ ${value.toFixed(2).replace('.', ',')}`;
    }
};

const render = {
    // ... Coloque aqui o objeto render completo da sua aplicação
    // Colei abaixo a versão completa para garantir
    createMonthContentHTML: (monthIndex) => `<div id="month-${monthIndex}-content" class="month-content"><div class="flex justify-end gap-2 mb-4"><button class="export-csv-btn px-4 py-2 text-sm font-semibold rounded-lg" style="background-color: var(--secondary-bg); color: var(--secondary-text);" data-month-index="${monthIndex}">Exportar CSV</button><button class="export-pdf-btn px-4 py-2 text-sm font-semibold rounded-lg" style="background-color: var(--secondary-bg); color: var(--secondary-text);" data-month-index="${monthIndex}">Exportar PDF</button></div><div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8"><div class="lg:col-span-1 p-5 rounded-2xl card border-t-4 border-yellow-400"><h2 class="text-xl font-semibold mb-4">Ganhos PJ</h2><div id="pj-entries-container-${monthIndex}" class="flex flex-col gap-3 mb-3"></div><button class="add-entry-btn mt-2 w-full py-2 text-sm font-semibold rounded-lg" style="background-color: var(--secondary-bg); color: var(--secondary-text);" data-month-index="${monthIndex}" data-type="pj">+ Adicionar Ganho PJ</button></div><div class="lg:col-span-1 p-5 rounded-2xl card border-t-4 border-green-400"><h2 class="text-xl font-semibold mb-4">Ganhos PF</h2><div id="pf-entries-container-${monthIndex}" class="flex flex-col gap-3 mb-3"></div><button class="add-entry-btn mt-2 w-full py-2 text-sm font-semibold rounded-lg" style="background-color: var(--secondary-bg); color: var(--secondary-text);" data-month-index="${monthIndex}" data-type="pf">+ Adicionar Ganho PF</button></div><div class="lg:col-span-1 grid gap-6"><div><div class="p-5 rounded-2xl card border-t-4 border-blue-400 space-y-4"><div class="space-y-1"><label class="block text-sm font-medium muted-text">Caixa da empresa:</label><p id="companyCash-${monthIndex}" class="text-2xl font-semibold">R$ 0,00</p></div><div class="space-y-1"><label class="block text-sm font-medium muted-text">Caixa pessoal:</label><p id="personalCash-${monthIndex}" class="text-2xl font-semibold">R$ 0,00</p></div></div></div><div><div class="flex justify-end mb-2"><button class="toggle-summary-btn text-sm font-medium hover:underline" style="color: var(--primary-color);" data-month-index="${monthIndex}">Ocultar Resumo ▼</button></div><div id="summary-card-${monthIndex}" class="p-5 rounded-2xl card border-t-4 border-purple-400"><h2 class="text-xl font-semibold mb-4">Resumo do Mês</h2><div class="space-y-2 text-sm"><div class="flex justify-between items-center"><span>Gasto Pessoal:</span><span id="totalPersonalExpenses-${monthIndex}" class="font-semibold" style="color: var(--red-color);">R$ 0,00</span></div><div class="flex justify-between items-center"><span>Gasto Empresa:</span><span id="totalBusinessExpenses-${monthIndex}" class="font-semibold" style="color: var(--red-color);">R$ 0,00</span></div><div class="flex justify-between items-center pt-2 border-t" style="border-color: var(--border-color);"><span>Saldo Pessoal:</span><span id="remainingPersonal-${monthIndex}" class="font-semibold">R$ 0,00</span></div><div class="flex justify-between items-center"><span>Saldo Empresa:</span><span id="remainingBusiness-${monthIndex}" class="font-semibold">R$ 0,00</span></div><div class="flex justify-between items-center border-t pt-2 mt-2" style="border-color: var(--border-color);"><span class="font-semibold">Saldo Total:</span><span id="remainingTotal-${monthIndex}" class="text-xl font-bold">R$ 0,00</span></div></div><div id="budget-alerts-${monthIndex}" class="mt-3 text-xs"></div></div></div></div></div></div>`,
    createEntryElement: (config) => { /* ... sua função completa ... */ },
    // ... etc. para todas as funções de render
};

function recalculateAndDisplayTotals(m) { /* ... sua função completa ... */ }

function showMonth(monthIndex) {
    state.activeMonthIndex = monthIndex;
    document.querySelectorAll('.month-content').forEach(c => c.classList.remove('active'));
    render.renderTabs();
    const contentEl = document.getElementById(`month-${monthIndex}-content`);
    if (contentEl) {
        contentEl.classList.add('active');
        // ... Lógica de renderização de PJ/PF/Expenses
        recalculateAndDisplayTotals(monthIndex);
    }
}

async function handleLogin(user) {
    try {
        await user.getIdToken(true);
        document.getElementById('loading-overlay').classList.remove('hidden');
        state.currentUserId = user.uid;
        const userData = await loadUserData(user.uid);
        Object.assign(state, userData);
        for (let i = 0; i < 12; i++) {
            if (!state.monthlyData[i]) {
                state.monthlyData[i] = { 
                    pjEntries: [], pfEntries: [], 
                    expenses: Array(31).fill(null).map(() => ({ personalEntries: [], businessEntries: [] })) 
                };
            }
        }
        initializeAppUI();
    } catch (error) {
        console.error("Erro no handleLogin:", error);
        document.getElementById('loading-overlay').classList.add('hidden');
        alert("Não foi possível carregar os dados.");
    }
}

function initializeAppUI() {
    const monthContentContainer = document.getElementById('monthContentContainer');
    monthContentContainer.innerHTML = '';
    constants.monthNames.forEach((_, index) => {
        monthContentContainer.insertAdjacentHTML('beforeend', render.createMonthContentHTML(index));
    });
    showMonth(state.activeMonthIndex);
    document.getElementById('loading-overlay').classList.add('hidden');
}

function bindGlobalEventListeners() {
    document.body.addEventListener('click', (event) => {
        if (!state.currentUserId) return;
        const target = event.target;
        if (target.closest('.tab-button')) {
            showMonth(parseInt(target.closest('.tab-button').dataset.monthIndex));
        }
        // ... Adicione aqui a lógica completa para os outros botões (add, remove, etc.)
    });
    document.body.addEventListener('input', (event) => {
        // ... Lógica completa para os inputs
    });
}

function main() {
    applyTheme(localStorage.getItem('theme') || 'light');
    bindGlobalEventListeners();
    setupAuthEventListeners(handleLogin, () => { state.currentUserId = null; });
    
    // ==================================================================
    // ALTERAÇÃO PARA DEPURAÇÃO:
    // Expondo o state e a função showMonth para o escopo global (window)
    // Isso nos permite testá-los diretamente no console.
    // ==================================================================
    window.state = state;
    window.showMonth = showMonth;
}

// Inicia a aplicação
main();
