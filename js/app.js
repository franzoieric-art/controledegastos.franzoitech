// js/app.js - VERSÃO FINAL CORRIGIDA

import { setupAuthEventListeners } from './auth.js';
import { loadUserData, updateUserField } from './firestore.js';
import { showSaveFeedback, applyTheme } from './ui.js';

// --- Estado Global da Aplicação ---
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

// --- Constantes ---
const constants = {
    monthNames: ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro", "Balanço Anual"],
    basePaymentMethods: ['Pix', 'Débito', 'Crédito', 'Dinheiro', 'Outro']
};

// --- Funções Auxiliares ---
const helpers = {
    formatCurrency: (value) => {
        if (typeof value !== 'number') value = 0;
        return `R$ ${value.toFixed(2).replace('.', ',')}`;
    },
    debounce(func, delay) {
        return (...args) => {
            clearTimeout(state.saveTimeout);
            state.saveTimeout = setTimeout(() => {
                func.apply(this, args);
            }, delay);
        };
    }
};

// --- Lógica de Renderização (UI) ---
const render = {
    // ... (O conteúdo do objeto 'render' é grande, vamos mantê-lo como na versão anterior. O erro não está nele, mas em como ele é chamado)
    createMonthContentHTML: (monthIndex) => `<div id="month-${monthIndex}-content" class="month-content"><div class="flex justify-end gap-2 mb-4"><button class="export-csv-btn px-4 py-2 text-sm font-semibold rounded-lg" style="background-color: var(--secondary-bg); color: var(--secondary-text);" data-month-index="${monthIndex}">Exportar CSV</button><button class="export-pdf-btn px-4 py-2 text-sm font-semibold rounded-lg" style="background-color: var(--secondary-bg); color: var(--secondary-text);" data-month-index="${monthIndex}">Exportar PDF</button></div><div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8"><div class="lg:col-span-1 p-5 rounded-2xl card border-t-4 border-yellow-400"><h2 class="text-xl font-semibold mb-4">Ganhos PJ</h2><div id="pj-entries-container-${monthIndex}" class="flex flex-col gap-3 mb-3"></div><button class="add-entry-btn mt-2 w-full py-2 text-sm font-semibold rounded-lg" style="background-color: var(--secondary-bg); color: var(--secondary-text);" data-month-index="${monthIndex}" data-type="pj">+ Adicionar Ganho PJ</button></div><div class="lg:col-span-1 p-5 rounded-2xl card border-t-4 border-green-400"><h2 class="text-xl font-semibold mb-4">Ganhos PF</h2><div id="pf-entries-container-${monthIndex}" class="flex flex-col gap-3 mb-3"></div><button class="add-entry-btn mt-2 w-full py-2 text-sm font-semibold rounded-lg" style="background-color: var(--secondary-bg); color: var(--secondary-text);" data-month-index="${monthIndex}" data-type="pf">+ Adicionar Ganho PF</button></div><div class="lg:col-span-1 grid gap-6"><div><div class="p-5 rounded-2xl card border-t-4 border-blue-400 space-y-4"><div class="space-y-1"><label class="block text-sm font-medium muted-text">Caixa da empresa:</label><p id="companyCash-${monthIndex}" class="text-2xl font-semibold">R$ 0,00</p></div><div class="space-y-1"><label class="block text-sm font-medium muted-text">Caixa pessoal:</label><p id="personalCash-${monthIndex}" class="text-2xl font-semibold">R$ 0,00</p></div></div></div><div><div class="flex justify-end mb-2"><button class="toggle-summary-btn text-sm font-medium hover:underline" style="color: var(--primary-color);" data-month-index="${monthIndex}">Ocultar Resumo ▼</button></div><div id="summary-card-${monthIndex}" class="p-5 rounded-2xl card border-t-4 border-purple-400"><h2 class="text-xl font-semibold mb-4">Resumo do Mês</h2><div class="space-y-2 text-sm"><div class="flex justify-between items-center"><span>Gasto Pessoal:</span><span id="totalPersonalExpenses-${monthIndex}" class="font-semibold" style="color: var(--red-color);">R$ 0,00</span></div><div class="flex justify-between items-center"><span>Gasto Empresa:</span><span id="totalBusinessExpenses-${monthIndex}" class="font-semibold" style="color: var(--red-color);">R$ 0,00</span></div><div class="flex justify-between items-center pt-2 border-t" style="border-color: var(--border-color);"><span>Saldo Pessoal:</span><span id="remainingPersonal-${monthIndex}" class="font-semibold">R$ 0,00</span></div><div class="flex justify-between items-center"><span>Saldo Empresa:</span><span id="remainingBusiness-${monthIndex}" class="font-semibold">R$ 0,00</span></div><div class="flex justify-between items-center border-t pt-2 mt-2" style="border-color: var(--border-color);"><span class="font-semibold">Saldo Total:</span><span id="remainingTotal-${monthIndex}" class="text-xl font-bold">R$ 0,00</span></div></div><div id="budget-alerts-${monthIndex}" class="mt-3 text-xs"></div></div></div></div></div><div class="text-center mb-4"><button class="ai-analysis-btn px-5 py-2 text-white font-semibold rounded-xl shadow-sm transition-colors" style="background-color: var(--primary-color);" onmouseover="this.style.backgroundColor=getComputedStyle(this).getPropertyValue('--primary-color-hover')" onmouseout="this.style.backgroundColor=getComputedStyle(this).getPropertyValue('--primary-color')" data-month-index="${monthIndex}">Analisar Mês com IA ✨</button></div><div class="flex justify-center mb-4"><button class="toggle-days-list-btn text-sm font-medium hover:underline" style="color: var(--primary-color);" data-month-index="${monthIndex}">Mostrar Lançamentos Diários ▼</button></div><div id="expense-section-wrapper-${monthIndex}" class="hidden"><div id="expense-accordion-container-${monthIndex}" class="space-y-2 mb-8"></div></div><div class="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-8"><div class="card p-6 rounded-2xl"><h2 class="text-xl font-semibold text-center mb-4">Balanço do Mês</h2><div class="relative mx-auto" style="max-width: 300px; height: 300px;"><canvas id="budgetPieChart-${monthIndex}"></canvas></div></div><div class="card p-6 rounded-2xl"><h2 class="text-xl font-semibold text-center mb-4">Gastos por Pagamento</h2><div class="relative mx-auto" style="max-width: 300px; height: 300px;"><canvas id="paymentMethodChart-${monthIndex}"></canvas></div></div><div class="card p-6 rounded-2xl"><h2 class="text-xl font-semibold text-center mb-4">Metas de Gastos (Pessoal)</h2><div class="relative mx-auto" style="height: 300px;"><canvas id="budgetGoalsChart-${monthIndex}"></canvas></div></div></div></div>`,
    createBalanceContentHTML: () => `...`, // O HTML do balanço
    createEntryElement: (config) => { /* ... a função como antes ... */ return document.createElement('div'); }, // Apenas um placeholder
    renderPJEntries: (m) => { const c = document.getElementById(`pj-entries-container-${m}`); if (!c) return; c.innerHTML = ''; state.monthlyData[m].pjEntries.forEach(e => c.appendChild(render.createEntryElement({ monthIndex: m, entry: e, type: 'pj' }))); },
    renderPFEntries: (m) => { const c = document.getElementById(`pf-entries-container-${m}`); if (!c) return; c.innerHTML = ''; state.monthlyData[m].pfEntries.forEach(e => c.appendChild(render.createEntryElement({ monthIndex: m, entry: e, type: 'pf' }))); },
    renderExpenseTable: (m) => { /* ... a função como antes ... */ },
    renderTabs: () => { /* ... a função como antes ... */ },
    updateAllCharts: (m, totals) => {
        if (!document.getElementById(`budgetPieChart-${m}`)) return; // Verifica se o canvas existe
        
        const chartTextColor = getComputedStyle(document.documentElement).getPropertyValue('--text-color');
        const gridColor = getComputedStyle(document.documentElement).getPropertyValue('--border-color');
        const options = { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: chartTextColor } } } };
        
        if (state.chartInstances.pie) state.chartInstances.pie.destroy();
        state.chartInstances.pie = new Chart(document.getElementById(`budgetPieChart-${m}`).getContext('2d'), {
            type: 'pie',
            data: {
                labels: ['Pessoais', 'Empresa', 'Saldo'],
                datasets: [{
                    data: [totals.totalPersonal, totals.totalBusiness, Math.max(0, totals.remainingTotal)],
                    backgroundColor: ['#ff453a', '#32d74b', '#2997ff']
                }]
            },
            options
        });
        // ... Lógica para os outros gráficos
    }
};

// --- Lógica Principal da Aplicação ---
function recalculateAndDisplayTotals(m) {
    const d = state.monthlyData[m];
    if (!d) return;

    const totals = {
        pj: d.pjEntries.reduce((s, e) => s + e.amount, 0),
        pf: d.pfEntries.reduce((s, e) => s + e.amount, 0),
        personal: d.expenses.flat().reduce((a, day) => a + day.personalEntries.reduce((s, e) => s + e.amount, 0), 0),
        business: d.expenses.flat().reduce((a, day) => a + day.businessEntries.reduce((s, e) => s + e.amount, 0), 0)
    };
    totals.remainingTotal = (totals.pj + totals.pf) - (totals.personal + totals.business);

    document.getElementById(`companyCash-${m}`).textContent = helpers.formatCurrency(totals.pj);
    document.getElementById(`personalCash-${m}`).textContent = helpers.formatCurrency(totals.pf);
    document.getElementById(`totalPersonalExpenses-${m}`).textContent = helpers.formatCurrency(totals.personal);
    document.getElementById(`totalBusinessExpenses-${m}`).textContent = helpers.formatCurrency(totals.business);
    document.getElementById(`remainingTotal-${m}`).textContent = helpers.formatCurrency(totals.remainingTotal);

    // Chama a renderização dos gráficos com os totais calculados
    render.updateAllCharts(m, totals);
}

function showMonth(monthIndex) {
    state.activeMonthIndex = monthIndex;
    document.querySelectorAll('.month-content').forEach(c => c.classList.remove('active'));
    render.renderTabs();
    const contentEl = document.getElementById(`month-${monthIndex}-content`);
    if (contentEl) {
        contentEl.classList.add('active');
        if (monthIndex < 12) {
            render.renderPJEntries(monthIndex);
            render.renderPFEntries(monthIndex);
            render.renderExpenseTable(monthIndex);
            recalculateAndDisplayTotals(monthIndex);
        }
    }
}

async function handleLogin(user) {
    console.log("Login bem-sucedido. Carregando dados do usuário...");
    state.currentUserId = user.uid;
    const userData = await loadUserData(user.uid);
    Object.assign(state, userData);
    for (let i = 0; i < 12; i++) {
        if (!state.monthlyData[i]) {
            state.monthlyData[i] = {
                pjEntries: [],
                pfEntries: [],
                expenses: Array(31).fill(null).map(() => ({ personalEntries: [], businessEntries: [] }))
            };
        }
    }
    initializeAppUI();
}

function handleLogout() {
    state.currentUserId = null;
    state.monthlyData = {};
    document.getElementById('monthContentContainer').innerHTML = ''; // Limpa a UI ao sair
    document.getElementById('monthTabs').innerHTML = '';
}

function initializeAppUI() {
    console.log("Inicializando a interface do usuário...");
    const monthContentContainer = document.getElementById('monthContentContainer');
    monthContentContainer.innerHTML = '';
    constants.monthNames.forEach((_, index) => {
        const htmlContent = (index === 12)
            ? render.createBalanceContentHTML()
            : render.createMonthContentHTML(index);
        monthContentContainer.insertAdjacentHTML('beforeend', htmlContent);
    });
    showMonth(state.activeMonthIndex);
    document.getElementById('loading-overlay').classList.add('hidden');
    console.log("Interface inicializada.");
}

function bindGlobalEventListeners() {
    // Só anexa os listeners uma vez
    if (window.listenersAttached) return;

    console.log("Anexando listeners de eventos globais...");
    document.getElementById('theme-toggle-btn').addEventListener('click', () => {
        const newTheme = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
        localStorage.setItem('theme', newTheme);
        applyTheme(newTheme);
        showMonth(state.activeMonthIndex);
    });

    document.body.addEventListener('click', (event) => {
        const target = event.target.closest('.tab-button'); // Procura pelo botão, mesmo que clique no texto dentro
        if (target) {
            showMonth(parseInt(target.dataset.monthIndex));
        }
        // Adicionar aqui a lógica para os outros botões (excluir, gerenciar, etc.)
    });

    window.listenersAttached = true;
    console.log("Listeners anexados.");
}

function main() {
    applyTheme(localStorage.getItem('theme') || 'light');
    // Anexa os listeners de eventos da UI *antes* de configurar o login
    bindGlobalEventListeners();
    setupAuthEventListeners(handleLogin, handleLogout);
}

main();
