import { setupAuthEventListeners } from './auth.js';
import { loadUserData, updateUserField } from './firestore.js';
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

// --- Funções Auxiliares ---
const helpers = {
    formatCurrency: (value) => `R$ ${value.toFixed(2).replace('.', ',')}`,
    debounce(func, delay) {
        return (...args) => {
            clearTimeout(state.saveTimeout);
            state.saveTimeout = setTimeout(() => {
                func.apply(this, args);
            }, delay);
        };
    }
};

const debouncedUpdateField = helpers.debounce((...args) => {
    updateUserField(...args);
    showSaveFeedback();
}, 1500);


// --- Lógica de Renderização (UI) ---
const render = {
    // Adicione aqui TODO o objeto 'render' do seu código original.
    // Para facilitar, colei ele inteiro abaixo:
    createMonthContentHTML: (monthIndex) => `<div id="month-${monthIndex}-content" class="month-content"><div class="flex justify-end gap-2 mb-4"><button class="export-csv-btn px-4 py-2 text-sm font-semibold rounded-lg" style="background-color: var(--secondary-bg); color: var(--secondary-text);" data-month-index="${monthIndex}">Exportar CSV</button><button class="export-pdf-btn px-4 py-2 text-sm font-semibold rounded-lg" style="background-color: var(--secondary-bg); color: var(--secondary-text);" data-month-index="${monthIndex}">Exportar PDF</button></div><div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8"><div class="lg:col-span-1 p-5 rounded-2xl card border-t-4 border-yellow-400"><h2 class="text-xl font-semibold mb-4">Ganhos PJ</h2><div id="pj-entries-container-${monthIndex}" class="flex flex-col gap-3 mb-3"></div><button class="add-entry-btn mt-2 w-full py-2 text-sm font-semibold rounded-lg" style="background-color: var(--secondary-bg); color: var(--secondary-text);" data-month-index="${monthIndex}" data-type="pj">+ Adicionar Ganho PJ</button></div><div class="lg:col-span-1 p-5 rounded-2xl card border-t-4 border-green-400"><h2 class="text-xl font-semibold mb-4">Ganhos PF</h2><div id="pf-entries-container-${monthIndex}" class="flex flex-col gap-3 mb-3"></div><button class="add-entry-btn mt-2 w-full py-2 text-sm font-semibold rounded-lg" style="background-color: var(--secondary-bg); color: var(--secondary-text);" data-month-index="${monthIndex}" data-type="pf">+ Adicionar Ganho PF</button></div><div class="lg:col-span-1 grid gap-6"><div><div class="p-5 rounded-2xl card border-t-4 border-blue-400 space-y-4"><div class="space-y-1"><label class="block text-sm font-medium muted-text">Caixa da empresa:</label><p id="companyCash-${monthIndex}" class="text-2xl font-semibold">R$ 0,00</p></div><div class="space-y-1"><label class="block text-sm font-medium muted-text">Caixa pessoal:</label><p id="personalCash-${monthIndex}" class="text-2xl font-semibold">R$ 0,00</p></div></div></div><div><div class="flex justify-end mb-2"><button class="toggle-summary-btn text-sm font-medium hover:underline" style="color: var(--primary-color);" data-month-index="${monthIndex}">Ocultar Resumo ▼</button></div><div id="summary-card-${monthIndex}" class="p-5 rounded-2xl card border-t-4 border-purple-400"><h2 class="text-xl font-semibold mb-4">Resumo do Mês</h2><div class="space-y-2 text-sm"><div class="flex justify-between items-center"><span>Gasto Pessoal:</span><span id="totalPersonalExpenses-${monthIndex}" class="font-semibold" style="color: var(--red-color);">R$ 0,00</span></div><div class="flex justify-between items-center"><span>Gasto Empresa:</span><span id="totalBusinessExpenses-${monthIndex}" class="font-semibold" style="color: var(--red-color);">R$ 0,00</span></div><div class="flex justify-between items-center pt-2 border-t" style="border-color: var(--border-color);"><span>Saldo Pessoal:</span><span id="remainingPersonal-${monthIndex}" class="font-semibold">R$ 0,00</span></div><div class="flex justify-between items-center"><span>Saldo Empresa:</span><span id="remainingBusiness-${monthIndex}" class="font-semibold">R$ 0,00</span></div><div class="flex justify-between items-center border-t pt-2 mt-2" style="border-color: var(--border-color);"><span class="font-semibold">Saldo Total:</span><span id="remainingTotal-${monthIndex}" class="text-xl font-bold">R$ 0,00</span></div></div><div id="budget-alerts-${monthIndex}" class="mt-3 text-xs"></div></div></div></div></div><div class="text-center mb-4"><button class="ai-analysis-btn px-5 py-2 text-white font-semibold rounded-xl shadow-sm transition-colors" style="background-color: var(--primary-color);" onmouseover="this.style.backgroundColor=getComputedStyle(this).getPropertyValue('--primary-color-hover')" onmouseout="this.style.backgroundColor=getComputedStyle(this).getPropertyValue('--primary-color')" data-month-index="${monthIndex}">Analisar Mês com IA ✨</button></div><div class="flex justify-center mb-4"><button class="toggle-days-list-btn text-sm font-medium hover:underline" style="color: var(--primary-color);" data-month-index="${monthIndex}">Mostrar Lançamentos Diários ▼</button></div><div id="expense-section-wrapper-${monthIndex}" class="hidden"><div id="expense-accordion-container-${monthIndex}" class="space-y-2 mb-8"></div></div><div class="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-8"><div class="card p-6 rounded-2xl"><h2 class="text-xl font-semibold text-center mb-4">Balanço do Mês</h2><div class="relative mx-auto" style="max-width: 300px; height: 300px;"><canvas id="budgetPieChart-${monthIndex}"></canvas></div></div><div class="card p-6 rounded-2xl"><h2 class="text-xl font-semibold text-center mb-4">Gastos por Pagamento</h2><div class="relative mx-auto" style="max-width: 300px; height: 300px;"><canvas id="paymentMethodChart-${monthIndex}"></canvas></div></div><div class="card p-6 rounded-2xl"><h2 class="text-xl font-semibold text-center mb-4">Metas de Gastos (Pessoal)</h2><div class="relative mx-auto" style="height: 300px;"><canvas id="budgetGoalsChart-${monthIndex}"></canvas></div></div></div></div>`,
    createBalanceContentHTML: () => `<div id="month-12-content" class="month-content"><h2 class="text-3xl font-bold text-center mb-8">Balanço Anual</h2><div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 text-center"><div class="card border-t-4 border-yellow-400 p-5 rounded-2xl"><span class="block text-sm muted-text mb-2">Total Ganhos PJ</span><span id="totalAnnualPJ" class="text-2xl font-semibold">R$ 0,00</span></div><div class="card border-t-4 border-green-400 p-5 rounded-2xl"><span class="block text-sm muted-text mb-2">Total Ganhos PF</span><span id="totalAnnualPF" class="text-2xl font-semibold">R$ 0,00</span></div><div class="card border-t-4 border-red-400 p-5 rounded-2xl"><span class="block text-sm muted-text mb-2">Gastos Totais</span><span id="totalAnnualExpenses" class="text-2xl font-semibold">R$ 0,00</span></div><div class="card border-t-4 border-blue-400 p-5 rounded-2xl"><span class="block text-sm muted-text mb-2">Saldo Final</span><span id="annualBalance" class="text-2xl font-bold">R$ 0,00</span><p id="annualPerformance" class="text-lg font-semibold mt-1"></p></div></div><div class="grid grid-cols-1 lg:grid-cols-2 gap-6"><div class="card p-6 rounded-2xl lg:col-span-2"><h3 class="text-xl font-semibold text-center mb-4">Desempenho Mensal</h3><div class="relative mx-auto" style="height: 400px;"><canvas id="monthlyPerformanceBarChart"></canvas></div></div><div class="card p-6 rounded-2xl"><h3 class="text-xl font-semibold text-center mb-4">Maiores Gastos do Ano (Top 5)</h3><div id="top-spends-container" class="text-sm space-y-2 max-h-96 overflow-y-auto p-2"></div></div></div></div>`,
    createEntryElement: (config) => { const { monthIndex, dayIndex, category, entry, type } = config; const d = document.createElement('div'); d.classList.add('flex', 'items-center', 'gap-2', 'w-full', 'flex-wrap'); let r = '', p = '', c = '', s = '', aiBtn = ''; if (type === 'expense') { r = `<button class="remove-btn" data-type="expense" data-month-index="${monthIndex}" data-day="${dayIndex}" data-category="${category}" data-entry-id="${entry.id}">×</button>`; p = `<select class="entry-input p-2 input-field text-sm w-full sm:w-auto" data-field="paymentMethod">${constants.basePaymentMethods.map(m => `<option value="${m}" ${entry.paymentMethod === m ? 'selected' : ''}>${m}</option>`).join('')}</select>`; if (entry.paymentMethod === 'Crédito') c = `<select class="entry-input p-2 input-field text-sm w-full sm:w-auto" data-field="card">${state.creditCards.map(c => `<option value="${c}" ${entry.card === c ? 'selected' : ''}>${c}</option>`).join('')}</select>`; s = `<select class="entry-input p-2 input-field text-sm w-full sm:w-auto" data-field="category">${state.categories.map(c => `<option value="${c.name}" ${entry.category === c.name ? 'selected' : ''}>${c.name}</option>`).join('')}</select>`; aiBtn = `<button class="suggest-category-btn p-2 rounded-lg" style="background-color: var(--secondary-bg); color: var(--secondary-text);">✨</button>`; } else { r = `<button class="remove-btn" data-type="${type}" data-month-index="${monthIndex}" data-entry-id="${entry.id}">×</button>`; } d.innerHTML = `<input type="text" value="${entry.description}" placeholder="Descrição" class="entry-input flex-grow p-2 input-field text-sm" data-field="description"><input type="number" value="${entry.amount}" min="0" step="0.01" placeholder="0,00" class="entry-input w-28 p-2 input-field text-sm" data-field="amount">${s}${aiBtn}${p}<span class="card-selector-container">${c}</span>${r}`; return d; },
    renderPJEntries: (m) => { const c = document.getElementById(`pj-entries-container-${m}`); if (!c) return; c.innerHTML = ''; state.monthlyData[m].pjEntries.forEach(e => c.appendChild(render.createEntryElement({ monthIndex: m, entry: e, type: 'pj' }))); },
    renderPFEntries: (m) => { const c = document.getElementById(`pf-entries-container-${m}`); if (!c) return; c.innerHTML = ''; state.monthlyData[m].pfEntries.forEach(e => c.appendChild(render.createEntryElement({ monthIndex: m, entry: e, type: 'pf' }))); },
    renderExpenseTable: (m) => { const container = document.getElementById(`expense-accordion-container-${m}`); if (!container) return; container.innerHTML = ''; for (let day = 0; day < 31; day++) { const item = document.createElement('div'); item.className = 'accordion-item card rounded-xl overflow-hidden'; item.innerHTML = `<div class="accordion-trigger flex justify-between items-center p-4 cursor-pointer" style="background-color: var(--input-bg);"><span class="font-semibold">Dia ${day + 1}</span><span class="arrow text-xl muted-text">▼</span></div><div class="accordion-content"><div class="grid grid-cols-1 md:grid-cols-2 gap-6"><div><h3 class="font-semibold mb-3">Gastos Pessoais</h3><div id="personal-entries-${m}-${day}" class="flex flex-col gap-3"></div><button class="add-entry-btn mt-3 px-3 py-1.5 text-sm font-semibold rounded-lg" style="background-color: var(--secondary-bg); color: var(--secondary-text);" data-month-index="${m}" data-day="${day}" data-type="expense" data-category="personal">+ Gasto Pessoal</button></div><div><h3 class="font-semibold mb-3">Gastos da Empresa</h3><div id="business-entries-${m}-${day}" class="flex flex-col gap-3"></div><button class="add-entry-btn mt-3 px-3 py-1.5 text-sm font-semibold rounded-lg" style="background-color: var(--secondary-bg); color: var(--secondary-text);" data-month-index="${m}" data-day="${day}" data-type="expense" data-category="business">+ Gasto Empresa</button></div></div></div>`; container.appendChild(item); ['personal', 'business'].forEach(type => { const entriesContainer = item.querySelector(`#${type}-entries-${m}-${day}`); state.monthlyData[m].expenses[day][`${type}Entries`].forEach(e => entriesContainer.appendChild(render.createEntryElement({ monthIndex: m, dayIndex: day, category: type, entry: e, type: 'expense' }))); }); } },
    renderTabs: () => { const baseClasses = "px-4 py-2 rounded-xl text-sm font-semibold transition-colors"; const activeClasses = "text-white shadow-sm"; const inactiveClasses = "hover:bg-black/5 dark:hover:bg-white/5"; const monthTabsContainer = document.getElementById('monthTabs'); monthTabsContainer.innerHTML = constants.monthNames.map((m, i) => `<button class="tab-button ${baseClasses} ${i === state.activeMonthIndex ? activeClasses : inactiveClasses}" style="${i === state.activeMonthIndex ? 'background-color: var(--primary-color);' : 'background-color: var(--secondary-bg); color: var(--secondary-text);'}" data-month-index="${i}">${m}</button>`).join(''); },
};

// --- Lógica Principal da Aplicação ---

function recalculateAndDisplayTotals(m) {
    const d = state.monthlyData[m];
    if (!d) return;
    const t = {
        pj: d.pjEntries.reduce((s, e) => s + e.amount, 0),
        pf: d.pfEntries.reduce((s, e) => s + e.amount, 0),
        personal: d.expenses.flat().reduce((a, day) => a + day.personalEntries.reduce((s, e) => s + e.amount, 0), 0),
        business: d.expenses.flat().reduce((a, day) => a + day.businessEntries.reduce((s, e) => s + e.amount, 0), 0)
    };
    t.remainingPersonal = t.pf - t.personal;
    t.remainingBusiness = t.pj - t.business;
    t.remainingTotal = (t.pj + t.pf) - (t.personal + t.business);
    document.getElementById(`companyCash-${m}`).textContent = helpers.formatCurrency(t.pj);
    document.getElementById(`personalCash-${m}`).textContent = helpers.formatCurrency(t.pf);
    document.getElementById(`totalPersonalExpenses-${m}`).textContent = helpers.formatCurrency(t.personal);
    document.getElementById(`totalBusinessExpenses-${m}`).textContent = helpers.formatCurrency(t.business);
    const rpEl = document.getElementById(`remainingPersonal-${m}`);
    rpEl.textContent = helpers.formatCurrency(t.remainingPersonal);
    rpEl.style.color = t.remainingPersonal < 0 ? 'var(--red-color)' : 'var(--green-color)';
    const rbEl = document.getElementById(`remainingBusiness-${m}`);
    rbEl.textContent = helpers.formatCurrency(t.remainingBusiness);
    rbEl.style.color = t.remainingBusiness < 0 ? 'var(--red-color)' : 'var(--green-color)';
    const rtEl = document.getElementById(`remainingTotal-${m}`);
    rt
