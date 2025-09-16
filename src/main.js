console.log('Verificando VITE_FIREBASE_API_KEY:', import.meta.env.VITE_FIREBASE_API_KEY);
console.log('Todas as variáveis de ambiente do Vite:', import.meta.env);

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-storage.js";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const authScreen = document.getElementById('auth-screen');
const appScreen = document.getElementById('app-screen');
const mainAuthBtn = document.getElementById('main-auth-btn');
const forgotPasswordLink = document.getElementById('forgot-password-link');
const authError = document.getElementById('auth-error');
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const loadingOverlay = document.getElementById('loading-overlay');
let isLoginMode = true;

const handleAuthKeyPress = (event) => { if (event.key === 'Enter') { event.preventDefault(); mainAuthBtn.click(); } };
document.getElementById('email-input').addEventListener('keydown', handleAuthKeyPress);
document.getElementById('password-input').addEventListener('keydown', handleAuthKeyPress);
document.getElementById('confirm-password-input').addEventListener('keydown', handleAuthKeyPress);

const showError = (message) => { authError.textContent = message; };

const applyTheme = (theme) => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    if (themeToggleBtn) {
        themeToggleBtn.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
    if (window.App && App.state.currentUserId) { App.showMonth(App.state.activeMonthIndex); }
};

applyTheme(localStorage.getItem('theme') || 'light');

mainAuthBtn.addEventListener('click', () => {
    const email = document.getElementById('email-input').value;
    const password = document.getElementById('password-input').value;
    showError('');
    const originalBtnText = mainAuthBtn.textContent;
    mainAuthBtn.disabled = true;
    mainAuthBtn.textContent = 'Aguarde...';
    const restoreBtn = () => { mainAuthBtn.disabled = false; mainAuthBtn.textContent = originalBtnText; };
    if (isLoginMode) {
        signInWithEmailAndPassword(auth, email, password).catch(error => { showError('Email ou senha inválidos.'); restoreBtn(); });
    } else {
        const confirmPassword = document.getElementById('confirm-password-input').value;
        if (password !== confirmPassword) { showError('As senhas não coincidem.'); restoreBtn(); return; }
        createUserWithEmailAndPassword(auth, email, password).catch(error => {
            if (error.code === 'auth/email-already-in-use') showError('Este email já está em uso.');
            else if (error.code === 'auth/weak-password') showError('A senha deve ter pelo menos 6 caracteres.');
            else showError('Erro ao criar conta.');
            restoreBtn();
        });
    }
});

forgotPasswordLink.addEventListener('click', (e) => {
    e.preventDefault();
    const email = document.getElementById('email-input').value;
    if (!email) { showError('Por favor, insira seu email para recuperar a senha.'); return; }
    sendPasswordResetEmail(auth, email).then(() => { showError('Email de recuperação enviado!'); }).catch((error) => { showError('Não foi possível enviar o email.'); });
});

const App = {
    state: {
        currentUserId: null,
        profile: { name: '', avatarUrl: '' },
        integrations: {
            whatsapp: { phoneNumberId: '', accessToken: '', webhookVerifyToken: '' }
        },
        creditCards: [],
        categories: [{ name: 'Alimentação', budget: 500 }, { name: 'Transporte', budget: 150 }, { name: 'Moradia', budget: 1500 }, { name: 'Lazer', budget: 300 }, { name: 'Saúde', budget: 200 }, { name: 'Outros', budget: 100 }],
        recurringEntries: [],
        monthlyData: {},
        activeMonthIndex: new Date().getMonth(),
        lastViewedMonthIndex: new Date().getMonth(),
        chartInstances: {},
        saveTimeout: null
    },

    ui: {
        monthContentContainer: null, settingsModal: null, accountModal: null,
        userNameInput: null, userEmailDisplay: null, whatsappPhoneId: null,
        whatsappToken: null, whatsappWebhookUrl: null, whatsappVerifyToken: null,
        whatsappStatus: null, newCardNameInput: null, cardListContainer: null,
        newCategoryNameInput: null, categoryListContainer: null,
        recurringListContainer: null, saveFeedback: null,
        aiAnalysisModal: null, aiAnalysisResult: null
    },

    constants: {
        monthNames: ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro", "Balanço Anual"],
        basePaymentMethods: ['Pix', 'Débito', 'Crédito', 'Dinheiro', 'Outro']
    },

    init(userId) {
        this.state.currentUserId = userId;
        this.ui.monthContentContainer = document.getElementById('monthContentContainer');
        this.ui.settingsModal = document.getElementById('settings-modal');
        this.ui.accountModal = document.getElementById('account-modal');
        this.ui.userNameInput = document.getElementById('user-name-input');
        this.ui.userEmailDisplay = document.getElementById('user-email-display');
        this.ui.whatsappPhoneId = document.getElementById('whatsapp-phone-id');
        this.ui.whatsappToken = document.getElementById('whatsapp-token');
        this.ui.whatsappWebhookUrl = document.getElementById('whatsapp-webhook-url');
        this.ui.whatsappVerifyToken = document.getElementById('whatsapp-verify-token');
        this.ui.whatsappStatus = document.getElementById('whatsapp-status');
        this.ui.newCardNameInput = document.getElementById('new-card-name');
        this.ui.cardListContainer = document.getElementById('card-list');
        this.ui.newCategoryNameInput = document.getElementById('new-category-name');
        this.ui.categoryListContainer = document.getElementById('category-list');
        this.ui.recurringListContainer = document.getElementById('recurring-list');
        this.ui.saveFeedback = document.getElementById('save-feedback');
        this.ui.aiAnalysisModal = document.getElementById('ai-analysis-modal');
        this.ui.aiAnalysisResult = document.getElementById('ai-analysis-result');
        this.loadData();
        this.bindGlobalEventListeners();
    },

    helpers: {
        formatCurrency: (value) => `R$ ${value.toFixed(2).replace('.', ',')}`,
        debounce(func, delay) { return (...args) => { clearTimeout(App.state.saveTimeout); App.state.saveTimeout = setTimeout(() => { func.apply(this, args); }, delay); }; },
        showSaveFeedback() { App.ui.saveFeedback.classList.add('show'); setTimeout(() => { App.ui.saveFeedback.classList.remove('show'); }, 2000); },
        cleanAIResponse(text) {
            if (typeof text !== 'string') return '';
            let cleanedText = text.replace(/```html|```/g, '');
            const firstTagIndex = cleanedText.indexOf('<');
            if (firstTagIndex > -1) { cleanedText = cleanedText.substring(firstTagIndex); }
            const noiseKeywords = ["Observações:", "Como usar:", "Cálculo dos Totais:", "Formatação HTML:", "Personalização das Sugestões:"];
            for (const keyword of noiseKeywords) {
                const noiseIndex = cleanedText.indexOf(keyword);
                if (noiseIndex > 50) { cleanedText = cleanedText.substring(0, noiseIndex); }
            }
            return cleanedText.trim();
        },
        generateRandomToken() { return [...Array(32)].map(() => Math.floor(Math.random() * 16).toString(16)).join(''); }
    },

    async handleAvatarUpload(event) {
        const file = event.target.files[0];
        if (!file || !this.state.currentUserId) return;
        const avatarImg = document.getElementById('user-avatar');
        const originalSrc = avatarImg.src;
        avatarImg.style.opacity = '0.5';
        try {
            const storagePath = `avatars/${this.state.currentUserId}`;
            const storageRef = ref(storage, storagePath);
            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);
            this.state.profile.avatarUrl = downloadURL;
            avatarImg.src = downloadURL;
            await this.saveDataToFirestore();
        } catch (error) {
            console.error("Erro no upload do avatar:", error);
            avatarImg.src = originalSrc;
        } finally {
            avatarImg.style.opacity = '1';
        }
    },

    async saveDataToFirestore() {
        if (!App.state.currentUserId) return;
        try {
            const dataToSave = {
                profile: App.state.profile,
                integrations: App.state.integrations,
                monthlyData: App.state.monthlyData,
                creditCards: App.state.creditCards,
                categories: App.state.categories,
                recurringEntries: App.state.recurringEntries
            };
            await setDoc(doc(db, 'users', App.state.currentUserId), dataToSave, { merge: true });
            App.helpers.showSaveFeedback();
        } catch (e) { console.error("Erro ao salvar dados: ", e); }
    },

    debouncedSave: null,

    async loadData() {
        if (!this.state.currentUserId) return;
        try {
            const docSnap = await getDoc(doc(db, 'users', this.state.currentUserId));
            if (docSnap.exists()) {
                const d = docSnap.data();
                this.state.profile = d.profile || { name: '', avatarUrl: '' };
                this.state.integrations = d.integrations || { whatsapp: { phoneNumberId: '', accessToken: '', webhookVerifyToken: '' } };
                this.state.monthlyData = d.monthlyData || {};
                this.state.creditCards = d.creditCards || [];
                this.state.categories = d.categories && d.categories.length > 0 ? d.categories : this.state.categories;
                this.state.recurringEntries = d.recurringEntries || [];
            }
            if (!this.state.integrations.whatsapp.webhookVerifyToken) {
                this.state.integrations.whatsapp.webhookVerifyToken = this.helpers.generateRandomToken();
            }
            for (let i = 0; i < 12; i++) {
                if (!this.state.monthlyData[i]) { this.state.monthlyData[i] = {}; }
                this.state.monthlyData[i].pjEntries = this.state.monthlyData[i].pjEntries || [];
                this.state.monthlyData[i].pfEntries = this.state.monthlyData[i].pfEntries || [];
                if (!Array.isArray(this.state.monthlyData[i].expenses) || this.state.monthlyData[i].expenses.length < 31) {
                    this.state.monthlyData[i].expenses = Array(31).fill(null).map(() => ({ personalEntries: [], businessEntries: [] }));
                }
                this.state.monthlyData[i].expenses.forEach(day => {
                    if (day && day.personalEntries) {
                        day.personalEntries.forEach(entry => { if (!entry.category) entry.category = 'Outros'; });
                    }
                });
            }
        } catch (error) { console.error("Erro ao carregar dados:", error); }
        this.ui.monthContentContainer.innerHTML = '';
        this.constants.monthNames.forEach((_, index) => { this.ui.monthContentContainer.insertAdjacentHTML('beforeend', index === 12 ? this.render.createBalanceContentHTML() : this.render.createMonthContentHTML(index)); });
        this.showMonth(this.state.activeMonthIndex);
        loadingOverlay.classList.add('hidden');
        this.render.updateHeader();
    },

    handleRecurringDeletion(recurringId, startingMonthIndex = 0) {
        console.log(`--- INICIANDO REMOÇÃO ---\nID da Recorrência: ${recurringId}\nA partir do Mês (índice): ${startingMonthIndex}\n-------------------------`);
        for (let i = startingMonthIndex; i < 12; i++) {
            const monthData = this.state.monthlyData[i];
            if (!monthData) continue;
            monthData.pjEntries = monthData.pjEntries.filter(entry => entry.recurringId !== recurringId);
            monthData.pfEntries = monthData.pfEntries.filter(entry => entry.recurringId !== recurringId);
            monthData.expenses.forEach(day => {
                if (day.personalEntries) { day.personalEntries = day.personalEntries.filter(entry => entry.recurringId !== recurringId); }
                if (day.businessEntries) { day.businessEntries = day.businessEntries.filter(entry => entry.recurringId !== recurringId); }
            });
        }
        console.log(`Lançamentos com recurringId=${recurringId} removidos a partir do mês ${startingMonthIndex}.`);
    },

    showMonth(monthIndex) {
        if (this.state.activeMonthIndex !== monthIndex && this.state.saveTimeout) {
            clearTimeout(this.state.saveTimeout);
            this.saveDataToFirestore();
            this.state.saveTimeout = null;
        }
        if (monthIndex >= 0 && monthIndex <= 11) {
            this.state.lastViewedMonthIndex = monthIndex;
        }
        this.state.activeMonthIndex = monthIndex;
        Object.values(this.state.chartInstances).forEach(c => c?.destroy());
        document.querySelectorAll('.month-content').forEach(c => c.classList.remove('active'));
        if (monthIndex < 12) { this.applyRecurringEntries(monthIndex); }
        const contentEl = document.getElementById(`month-${monthIndex}-content`);
        if (contentEl) {
            contentEl.classList.add('active');
            if (monthIndex < 12) {
                this.render.renderCalendarView(monthIndex);
                this.render.renderPJEntries(monthIndex);
                this.render.renderPFEntries(monthIndex);
                this.render.renderExpenseTable(monthIndex);
                this.recalculateAndDisplayTotals(monthIndex);
            } else {
                this.render.renderBalanceSummary();
            }
        }
    },

    recalculateAndDisplayTotals(m) {
        const d = this.state.monthlyData[m];
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
        document.getElementById(`companyCash-${m}`).textContent = this.helpers.formatCurrency(t.pj);
        document.getElementById(`personalCash-${m}`).textContent = this.helpers.formatCurrency(t.pf);
        document.getElementById(`totalPersonalExpenses-${m}`).textContent = this.helpers.formatCurrency(t.personal);
        document.getElementById(`totalBusinessExpenses-${m}`).textContent = this.helpers.formatCurrency(t.business);
        const rpEl = document.getElementById(`remainingPersonal-${m}`);
        rpEl.textContent = this.helpers.formatCurrency(t.remainingPersonal);
        rpEl.style.color = t.remainingPersonal < 0 ? 'var(--red-color)' : 'var(--green-color)';
        const rbEl = document.getElementById(`remainingBusiness-${m}`);
        rbEl.textContent = this.helpers.formatCurrency(t.remainingBusiness);
        rbEl.style.color = t.remainingBusiness < 0 ? 'var(--red-color)' : 'var(--green-color)';
        const rtEl = document.getElementById(`remainingTotal-${m}`);
        rtEl.textContent = this.helpers.formatCurrency(t.remainingTotal);
        rtEl.style.color = t.remainingTotal < 0 ? 'var(--red-color)' : 'var(--primary-color)';
        this.render.updateBudgetAlerts(m);
        this.render.updateAllCharts(m, { totalPersonal: t.personal, totalBusiness: t.business, remainingBudget: t.remainingTotal });
    },

    applyRecurringEntries(monthIndex) {
        if (!this.state.monthlyData[monthIndex]) return;
        let wasModified = false;
        const appliedRecurringIds = new Set();
        const month = this.state.monthlyData[monthIndex];
        month.pfEntries.forEach(e => { if (e.recurringId) appliedRecurringIds.add(e.recurringId); });
        month.pjEntries.forEach(e => { if (e.recurringId) appliedRecurringIds.add(e.recurringId); });
        month.expenses.forEach(day => {
            day.personalEntries.forEach(e => { if (e.recurringId) appliedRecurringIds.add(e.recurringId); });
            day.businessEntries.forEach(e => { if (e.recurringId) appliedRecurringIds.add(e.recurringId); });
        });
        const currentYear = new Date().getFullYear();
        const daysInCurrentMonth = new Date(currentYear, monthIndex + 1, 0).getDate();
        this.state.recurringEntries.forEach(r => {
            if (r.id && !appliedRecurringIds.has(r.id)) {
                const effectiveDay = Math.min(r.dayOfMonth, daysInCurrentMonth);
                const dayIndex = effectiveDay - 1;
                if (dayIndex < 0 || dayIndex >= daysInCurrentMonth) return;
                const newEntry = {
                    id: Date.now() + Math.random(),
                    description: r.description || 'Lançamento recorrente',
                    amount: r.amount,
                    isRecurring: true,
                    recurringId: r.id
                };
                if (r.type === "Ganho PF") {
                    month.pfEntries.push(newEntry);
                    wasModified = true;
                } else if (r.type === "Ganho PJ") {
                    month.pjEntries.push(newEntry);
                    wasModified = true;
                } else if (r.type === "Gasto Pessoal") {
                    Object.assign(newEntry, { category: r.category, paymentMethod: r.paymentMethod, card: r.card });
                    month.expenses[dayIndex].personalEntries.push(newEntry);
                    wasModified = true;
                } else if (r.type === "Gasto Empresa") {
                    Object.assign(newEntry, { category: 'N/A', paymentMethod: r.paymentMethod, card: r.card });
                    month.expenses[dayIndex].businessEntries.push(newEntry);
                    wasModified = true;
                }
            }
        });
        if (wasModified) {
            this.saveDataToFirestore();
        }
    },

    exportMonthToCSV(monthIndex) {
        const monthData = this.state.monthlyData[monthIndex];
        if (!monthData) { return; }
        const monthName = this.constants.monthNames[monthIndex];
        const pjTotal = monthData.pjEntries.reduce((s, e) => s + e.amount, 0);
        const pfTotal = monthData.pfEntries.reduce((s, e) => s + e.amount, 0);
        const personalTotal = monthData.expenses.flat().reduce((a, day) => a + day.personalEntries.reduce((s, e) => s + e.amount, 0), 0);
        const businessTotal = monthData.expenses.flat().reduce((a, day) => a + day.businessEntries.reduce((s, e) => s + e.amount, 0), 0);
        const totalGains = pjTotal + pfTotal;
        const totalExpenses = personalTotal + businessTotal;
        const balance = totalGains - totalExpenses;
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += `Relatorio Financeiro - ${monthName}\r\n\r\n`;
        csvContent += "Resumo do Mes\r\n";
        csvContent += `Total de Ganhos;${totalGains.toFixed(2).replace('.', ',')}\r\n`;
        csvContent += `Total de Gastos;${totalExpenses.toFixed(2).replace('.', ',')}\r\n`;
        csvContent += `Saldo Final;${balance.toFixed(2).replace('.', ',')}\r\n\r\n`;
        csvContent += "Detalhes das Transacoes\r\n";
        csvContent += "Tipo;Dia;Descricao;Valor;Categoria;Metodo de Pagamento;Cartao\r\n";
        const sanitize = (str) => `"${(str || '').replace(/"/g, '""')}"`;
        monthData.pjEntries.forEach(e => csvContent += `Ganho PJ;;${sanitize(e.description)};${e.amount.toFixed(2).replace('.', ',')};;;\r\n`);
        monthData.pfEntries.forEach(e => csvContent += `Ganho PF;;${sanitize(e.description)};${e.amount.toFixed(2).replace('.', ',')};;;\r\n`);
        monthData.expenses.forEach((dayData, dayIndex) => {
            const processEntries = (entries, type) => {
                entries.forEach(e => { let row = [type, dayIndex + 1, sanitize(e.description), e.amount.toFixed(2).replace('.', ','), sanitize(e.category), sanitize(e.paymentMethod), sanitize(e.card)].join(';'); csvContent += row + "\r\n"; });
            };
            processEntries(dayData.personalEntries, 'Gasto Pessoal');
            processEntries(dayData.businessEntries, 'Gasto Empresa');
        });
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", `relatorio_${monthName}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },

    exportMonthToPDF(monthIndex) {
        const monthData = this.state.monthlyData[monthIndex];
        if (!monthData) { return; }
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const monthName = this.constants.monthNames[monthIndex];
        const pageHeight = doc.internal.pageSize.height;
        const pageWidth = doc.internal.pageSize.width;
        const addWatermark = (doc) => {
            doc.saveGraphicsState();
            doc.setGState(new doc.GState({ opacity: 0.05 }));
            doc.setFontSize(40);
            doc.setTextColor(200, 200, 200);
            doc.setFont('helvetica', 'bold');
            doc.text("Rico Plus by Franzoi Tech", pageWidth / 2, pageHeight / 1.8, { angle: -45, align: 'center' });
            doc.restoreGraphicsState();
        };
        const addHeaderAndFooter = (data) => {
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text("Relatório Financeiro", 14, 20);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`Período: ${monthName}`, 14, 26);
            doc.setLineWidth(0.5);
            doc.line(14, 30, pageWidth - 14, 30);
            const pageCount = doc.internal.getNumberOfPages();
            doc.setFontSize(8);
            doc.text(`Rico Plus by Franzoi Tech | Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, pageHeight - 10);
            doc.text(`Página ${data.pageNumber} de ${pageCount}`, pageWidth - 14, pageHeight - 10, { align: 'right' });
        };
        const pjTotal = monthData.pjEntries.reduce((s, e) => s + e.amount, 0);
        const pfTotal = monthData.pfEntries.reduce((s, e) => s + e.amount, 0);
        const personalTotal = monthData.expenses.flat().reduce((a, day) => a + day.personalEntries.reduce((s, e) => s + e.amount, 0), 0);
        const businessTotal = monthData.expenses.flat().reduce((a, day) => a + day.businessEntries.reduce((s, e) => s + e.amount, 0), 0);
        const balance = (pjTotal + pfTotal) - (personalTotal + businessTotal);
        const expensesByCategory = {};
        monthData.expenses.flat().forEach(day => { day.personalEntries.forEach(entry => { expensesByCategory[entry.category] = (expensesByCategory[entry.category] || 0) + entry.amount; }); });
        const categoryBody = Object.keys(expensesByCategory).map(cat => [cat, this.helpers.formatCurrency(expensesByCategory[cat])]);
        const transactionsBody = [];
        monthData.pjEntries.forEach(e => transactionsBody.push(['-', 'Ganho PJ', e.description, '-', '-', e.amount.toFixed(2).replace('.', ',')]));
        monthData.pfEntries.forEach(e => transactionsBody.push(['-', 'Ganho PF', e.description, '-', '-', e.amount.toFixed(2).replace('.', ',')]));
        monthData.expenses.forEach((dayData, dayIndex) => {
            dayData.personalEntries.forEach(e => transactionsBody.push([dayIndex + 1, 'Gasto Pessoal', e.description, e.category, `${e.paymentMethod}${e.card ? ` (${e.card})` : ''}`, e.amount.toFixed(2).replace('.', ',')]));
            dayData.businessEntries.forEach(e => transactionsBody.push([dayIndex + 1, 'Gasto Empresa', e.description, '-', `${e.paymentMethod}${e.card ? ` (${e.card})` : ''}`, e.amount.toFixed(2).replace('.', ',')]));
        });
        let finalY = 40;
        doc.autoTable({ startY: finalY, head: [['Resumo Geral', 'Valor']], body: [['Total Ganhos', this.helpers.formatCurrency(pjTotal + pfTotal)], ['Total Gastos', this.helpers.formatCurrency(personalTotal + businessTotal)], [{ content: 'Saldo Final', styles: { fontStyle: 'bold' } }, { content: this.helpers.formatCurrency(balance), styles: { fontStyle: 'bold' } }]], theme: 'grid', headStyles: { fillColor: [22, 160, 133] } });
        finalY = doc.lastAutoTable.finalY + 10;
        if (categoryBody.length > 0) { doc.autoTable({ startY: finalY, head: [['Gastos por Categoria (Pessoal)', 'Total']], body: categoryBody, theme: 'striped', headStyles: { fillColor: [41, 128, 185] } }); finalY = doc.lastAutoTable.finalY + 10; }
        doc.autoTable({ startY: finalY, head: [['Data', 'Tipo', 'Descrição', 'Cat.', 'Pag.', 'Valor (R$)']], body: transactionsBody, theme: 'grid', didDrawPage: (data) => { addWatermark(doc); addHeaderAndFooter(data); }, headStyles: { fillColor: [44, 62, 80] }, margin: { top: 38, bottom: 20 } });
        const pageCountFinal = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCountFinal; i++) { doc.setPage(i); addWatermark(doc); addHeaderAndFooter({ pageNumber: i, pageCount: pageCountFinal }); }
        doc.save(`relatorio_${monthName}.pdf`);
    },

    bindGlobalEventListeners() {
        this.debouncedSave = this.helpers.debounce(this.saveDataToFirestore, 750);
        
        const chatbotModal = document.getElementById('chatbot-modal');
        const chatbotModalContent = chatbotModal.querySelector('.modal-content');
        document.getElementById('floating-chatbot-btn').addEventListener('click', () => {
            document.body.classList.add('modal-open');
            chatbotModal.classList.remove('hidden');
            setTimeout(() => {
                chatbotModal.style.opacity = '1';
                chatbotModalContent.style.transform = 'translateY(0)';
            }, 10);
        });
        const closeChatbot = () => {
            document.body.classList.remove('modal-open');
            chatbotModal.style.opacity = '0';
            chatbotModalContent.style.transform = 'translateY(2rem)';
            setTimeout(() => {
                chatbotModal.classList.add('hidden');
            }, 300);
        };
        document.getElementById('close-chatbot-modal-btn').addEventListener('click', closeChatbot);
        document.getElementById('chatbot-send-btn').addEventListener('click', () => {
            const input = document.getElementById('chatbot-input');
            const messagesContainer = document.getElementById('chatbot-messages');
            const userMessage = input.value.trim();
            if (userMessage) {
                messagesContainer.innerHTML += `<div class="flex justify-end"><div class="p-3 rounded-lg max-w-[85%] text-sm text-white" style="background-color: var(--primary-color);"><p class="font-bold mb-1">Você</p><p>${userMessage}</p></div></div>`;
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
                setTimeout(() => {
                    messagesContainer.innerHTML += `<div class="p-3 rounded-lg max-w-[85%] text-sm" style="background-color: var(--secondary-bg);"><p class="font-bold mb-1">Assistente</p><p class="italic">Pensando...</p></div>`;
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                    App.ai.getChatbotResponse(userMessage);
                }, 500);
                input.value = '';
            }
        });
        document.getElementById('chatbot-input').addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                document.getElementById('chatbot-send-btn').click();
            }
        });
        
        document.getElementById('avatar-upload-input').addEventListener('change', this.handleAvatarUpload.bind(this));
        
        themeToggleBtn.addEventListener('click', () => {
            const newTheme = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
            localStorage.setItem('theme', newTheme);
            applyTheme(newTheme);
        });
        
        const actionMenuBtn = document.getElementById('action-menu-btn');
        const actionMenuDropdown = document.getElementById('action-menu-dropdown');
        if (actionMenuBtn && actionMenuDropdown) {
            actionMenuBtn.addEventListener('click', (event) => {
                event.stopPropagation();
                actionMenuDropdown.classList.toggle('is-closed');
            });
            document.addEventListener('click', () => {
                if (!actionMenuDropdown.classList.contains('is-closed')) {
                    actionMenuDropdown.classList.add('is-closed');
                }
            });
        }
        
        document.getElementById('manage-settings-btn').addEventListener('click', (event) => {
            event.preventDefault();
            document.body.classList.add('modal-open');
            this.render.renderSettingsModal();
        });
        document.getElementById('manage-account-btn').addEventListener('click', (event) => {
            event.preventDefault();
            document.body.classList.add('modal-open');
            this.render.renderAccountModal();
        });
        document.getElementById('logout-btn').addEventListener('click', (event) => {
            event.preventDefault();
            signOut(auth);
        });

        document.getElementById('close-modal-btn').addEventListener('click', () => {
            document.body.classList.remove('modal-open');
            this.ui.settingsModal.classList.add('hidden');
        });
        document.getElementById('close-account-modal-btn').addEventListener('click', () => {
            document.body.classList.remove('modal-open');
            this.ui.accountModal.classList.add('hidden');
        });
        document.getElementById('save-profile-btn').addEventListener('click', () => {
            App.state.profile.name = App.ui.userNameInput.value;
            App.saveDataToFirestore();
            App.ui.accountModal.classList.add('hidden');
            document.body.classList.remove('modal-open');
            App.helpers.showSaveFeedback();
            App.render.updateHeader();
        });
        document.getElementById('save-integration-btn').addEventListener('click', () => {
            const wa = App.state.integrations.whatsapp;
            wa.phoneNumberId = App.ui.whatsappPhoneId.value;
            wa.accessToken = App.ui.whatsappToken.value;
            wa.webhookVerifyToken = App.ui.whatsappVerifyToken.value;
            App.saveDataToFirestore();
            App.ui.accountModal.classList.add('hidden');
            App.helpers.showSaveFeedback();
        });
        document.getElementById('generate-verify-token-btn').addEventListener('click', () => {
            const newToken = this.helpers.generateRandomToken();
            App.ui.whatsappVerifyToken.value = newToken;
        });
        document.getElementById('copy-webhook-url-btn').addEventListener('click', (e) => {
            navigator.clipboard.writeText(App.ui.whatsappWebhookUrl.value);
            e.target.textContent = 'Copiado!';
            setTimeout(() => { e.target.textContent = 'Copiar'; }, 2000);
        });
        document.getElementById('close-ai-modal-btn').addEventListener('click', () => { this.ui.aiAnalysisModal.classList.add('hidden'); });
        document.getElementById('add-card-btn').addEventListener('click', () => { const n = this.ui.newCardNameInput.value.trim(); if (n && !this.state.creditCards.includes(n)) { this.state.creditCards.push(n); this.ui.newCardNameInput.value = ''; this.render.renderCardList(); this.saveDataToFirestore(); } });
        document.getElementById('add-category-btn').addEventListener('click', () => {
            const newName = this.ui.newCategoryNameInput.value.trim();
            const normalizedNewName = newName.toLowerCase();
            if (newName && !this.state.categories.some(c => c.name.toLowerCase() === normalizedNewName)) {
                this.state.categories.push({ name: newName, budget: 0 });
                this.ui.newCategoryNameInput.value = '';
                this.render.renderCategoryList();
                this.saveDataToFirestore();
            } else if (newName) {
                alert('Já existe uma categoria com este nome.');
            }
        });
        document.getElementById('recurring-type').addEventListener('change', (e) => { document.getElementById('recurring-expense-fields').classList.toggle('hidden', !e.target.value.includes('Gasto')); });
        document.getElementById('recurring-payment').addEventListener('change', (e) => { document.getElementById('recurring-card').classList.toggle('hidden', e.target.value !== 'Crédito'); });
        document.getElementById('add-recurring-btn').addEventListener('click', () => { const newRec = { id: Date.now(), description: document.getElementById('recurring-desc').value, amount: parseFloat(document.getElementById('recurring-amount').value) || 0, dayOfMonth: parseInt(document.getElementById('recurring-day').value) || 1, type: document.getElementById('recurring-type').value }; if (!newRec.description || newRec.amount <= 0) { alert('Preencha descrição e valor.'); return; } if (newRec.type.includes('Gasto')) { newRec.category = document.getElementById('recurring-category').value; newRec.paymentMethod = document.getElementById('recurring-payment').value; newRec.card = newRec.paymentMethod === 'Crédito' ? document.getElementById('recurring-card').value : ''; } this.state.recurringEntries.push(newRec); this.render.renderRecurringList(); this.saveDataToFirestore(); document.getElementById('recurring-form').querySelectorAll('input, select').forEach(el => el.value = ''); });
        
        document.body.addEventListener('click', (event) => {
            const t = event.target;
            
            const settingsAccordionTrigger = t.closest('.settings-accordion-trigger');
            if (settingsAccordionTrigger) {
                const parentItem = settingsAccordionTrigger.parentElement;
                parentItem.classList.toggle('active');
                return;
            }

            const navBtn = t.closest('.calendar-nav-btn, [data-action="show-annual"]');
            if (navBtn) {
                const action = navBtn.dataset.action;
                const currentMonth = App.state.activeMonthIndex;
                if (action === 'show-annual') { App.state.lastViewedMonthIndex = currentMonth; App.showMonth(12); } 
                else if (action === 'prev-month') { const prevMonth = (currentMonth - 1 + 12) % 12; App.showMonth(prevMonth); } 
                else if (action === 'next-month') { const nextMonth = (currentMonth + 1) % 12; App.showMonth(nextMonth); }
                return;
            }
            
            const dayCell = t.closest('.calendar-day.current-month');
            if (dayCell) {
                const dayIndex = parseInt(dayCell.dataset.day);
                const monthIndex = App.state.activeMonthIndex;
                const allAccordions = document.querySelectorAll(`#expense-accordion-container-${monthIndex} .accordion-item`);
                const accordionToToggle = allAccordions[dayIndex];
                const wasActive = dayCell.classList.contains('active');
                document.querySelectorAll(`#calendar-container-${monthIndex} .calendar-day.active`).forEach(el => el.classList.remove('active'));
                allAccordions.forEach(item => item.classList.remove('active'));
                if (!wasActive) {
                    dayCell.classList.add('active');
                    if (accordionToToggle) accordionToToggle.classList.add('active');
                }
            }

            if (t.matches('.tab-button')) this.showMonth(parseInt(t.dataset.monthIndex));
            if (t.matches('.export-csv-btn')) this.exportMonthToCSV(parseInt(t.dataset.monthIndex));
            if (t.matches('.export-pdf-btn')) this.exportMonthToPDF(parseInt(t.dataset.monthIndex));
            if (t.matches('#copy-pix-btn')) { const pixKey = document.getElementById('pix-key').textContent; navigator.clipboard.writeText(pixKey).then(() => { t.textContent = 'Copiado!'; setTimeout(() => { t.textContent = 'Copiar'; }, 2000); }); }
            if (t.closest('.accordion-trigger')) {
                const trigger = t.closest('.accordion-trigger');
                const parentItem = trigger.parentElement;
                const allItems = parentItem.parentElement.querySelectorAll('.accordion-item');
                if (parentItem.classList.contains('active')) {
                    parentItem.classList.remove('active');
                } else {
                    allItems.forEach(item => item.classList.remove('active'));
                    parentItem.classList.add('active');
                }
            }
            if (t.closest('.ai-analysis-btn')) this.ai.getFinancialAnalysis(parseInt(t.closest('.ai-analysis-btn').dataset.monthIndex));
            if (t.matches('#ai-annual-analysis-btn')) this.ai.getAnnualFinancialAnalysis();
            if (t.closest('.suggest-category-btn')) {
                const btn = t.closest('.suggest-category-btn');
                const el = btn.closest('.expense-entry-row');
                if (el) {
                    const entryId = el.querySelector('.remove-btn').dataset.entryId;
                    const descriptionInput = el.querySelector('[data-field="description"]');
                    if (descriptionInput && descriptionInput.value) {
                        this.ai.getCategorySuggestion(descriptionInput.value, entryId, btn);
                    }
                }
            }
            if (t.matches('.add-entry-btn')) {
                const { monthIndex, type, day, category } = t.dataset;
                const month = parseInt(monthIndex);
                const entries = (type === 'pj') ? this.state.monthlyData[month].pjEntries : (type === 'pf') ? this.state.monthlyData[month].pfEntries : this.state.monthlyData[month].expenses[parseInt(day)][`${category}Entries`];
                if (type === 'pj' || type === 'pf') {
                    const newEntry = { id: Date.now(), description: '', amount: 0 };
                    entries.push(newEntry);
                    document.getElementById(`${type}-entries-container-${month}`).appendChild(this.render.createEntryElement({ monthIndex: month, entry: newEntry, type: type }));
                } else if (type === 'expense') {
                    const n = { id: Date.now(), description: '', amount: 0, paymentMethod: 'Pix', card: this.state.creditCards.length > 0 ? this.state.creditCards[0] : '', category: this.state.categories[0].name };
                    entries.push(n);
                    document.getElementById(`${category}-entries-${month}-${day}`).appendChild(this.render.createEntryElement({ monthIndex: month, dayIndex: parseInt(day), category, entry: n, type: 'expense' }));
                }
                this.recalculateAndDisplayTotals(month);
                this.saveDataToFirestore();
            }
            if (t.matches('.remove-btn')) {
                const { monthIndex, type, day, category, entryId } = t.dataset;
                const month = parseInt(monthIndex);
                const id = parseFloat(entryId);
                if (type === 'pj') { this.state.monthlyData[month].pjEntries = this.state.monthlyData[month].pjEntries.filter(e => e.id !== id); }
                else if (type === 'pf') { this.state.monthlyData[month].pfEntries = this.state.monthlyData[month].pfEntries.filter(e => e.id !== id); }
                else { this.state.monthlyData[month].expenses[parseInt(day)][`${category}Entries`] = this.state.monthlyData[month].expenses[parseInt(day)][`${category}Entries`].filter(e => e.id !== id); }
                t.closest('.expense-entry-row').remove();
                this.recalculateAndDisplayTotals(month);
                this.saveDataToFirestore();
            }
            if (t.matches('.remove-card-btn')) {
                const cardNameToRemove = t.dataset.cardName;
                for (let i = 0; i < 12; i++) {
                    this.state.monthlyData[i].expenses.forEach(day => {
                        [...day.personalEntries, ...day.businessEntries].forEach(entry => {
                            if (entry.card === cardNameToRemove) entry.card = 'Cartão Removido';
                        });
                    });
                }
                this.state.creditCards = this.state.creditCards.filter(c => c !== cardNameToRemove);
                this.render.renderCardList();
                this.saveDataToFirestore();
            }
            if (t.matches('.remove-category-btn')) {
                const categoryNameToRemove = t.dataset.categoryName;
                for (let i = 0; i < 12; i++) {
                    this.state.monthlyData[i].expenses.forEach(day => {
                        day.personalEntries.forEach(entry => {
                            if (entry.category === categoryNameToRemove) entry.category = 'Outros';
                        });
                    });
                }
                this.state.categories = this.state.categories.filter(c => c.name !== categoryNameToRemove);
                this.render.renderCategoryList();
                this.saveDataToFirestore();
            }
            if (t.matches('.remove-recurring-btn')) {
                const index = parseInt(t.dataset.index);
                const entryToDelete = App.state.recurringEntries[index];
                if (entryToDelete && entryToDelete.id) {
                    const modal = document.getElementById('confirm-recurring-delete-modal');
                    modal.dataset.recurringId = entryToDelete.id;
                    modal.dataset.recurringIndex = index;
                    const futureBtn = document.getElementById('delete-future-recurring-btn');
                    const activeMonthName = App.constants.monthNames[App.state.activeMonthIndex];
                    futureBtn.textContent = `Remover de ${activeMonthName} em diante`;
                    modal.classList.remove('hidden');
                }
            }
            if (t.matches('[data-action="back-to-months"]')) {
                const lastMonth = App.state.lastViewedMonthIndex;
                if (typeof lastMonth === 'number') { App.showMonth(lastMonth); }
                else { App.showMonth(new Date().getMonth()); }
            }
        });

        document.body.addEventListener('input', (event) => {
            const t = event.target;
            if (t.matches('.entry-input')) {
                const el = t.closest('.expense-entry-row');
                const btn = el.querySelector('.remove-btn');
                if (!btn) return;
                const { monthIndex, type, day, category, entryId } = btn.dataset;
                const month = parseInt(monthIndex);
                const id = parseFloat(entryId);
                let entry;
                if (type === 'pj') { entry = this.state.monthlyData[month].pjEntries.find(e => e.id === id); } 
                else if (type === 'pf') { entry = this.state.monthlyData[month].pfEntries.find(e => e.id === id); } 
                else { entry = this.state.monthlyData[month].expenses[parseInt(day)][`${category}Entries`].find(e => e.id === id); }
                if (entry) { const field = t.dataset.field; if (field === 'amount') { entry.amount = parseFloat(t.value) || 0; } else { entry[field] = t.value; } if (field === 'paymentMethod') { this.showMonth(month); } else { this.recalculateAndDisplayTotals(month); } this.debouncedSave(); }
            }
            if (t.matches('.category-budget-input')) { const cat = this.state.categories.find(c => c.name === t.dataset.categoryName); if (cat) { cat.budget = parseFloat(t.value) || 0; this.debouncedSave(); } }
        });
        
        document.body.addEventListener('change', (event) => {
            const t = event.target;
            if (t.matches('.category-name-input')) {
                const oldName = t.dataset.oldName;
                const newName = t.value.trim();
                const normalizedNewName = newName.toLowerCase();
                const normalizedOldName = oldName.toLowerCase();
                const categoryExists = this.state.categories.some(c => c.name.toLowerCase() === normalizedNewName);
                if (newName && normalizedOldName !== normalizedNewName && !categoryExists) {
                    for (let i = 0; i < 12; i++) {
                        this.state.monthlyData[i].expenses.forEach(day => {
                            day.personalEntries.forEach(entry => {
                                if (entry.category.toLowerCase() === normalizedOldName) entry.category = newName;
                            });
                        });
                    }
                    const cat = this.state.categories.find(c => c.name.toLowerCase() === normalizedOldName);
                    if (cat) cat.name = newName;
                    t.dataset.oldName = newName;
                    this.state.recurringEntries.forEach(r => {
                        if (r.category.toLowerCase() === normalizedOldName) r.category = newName;
                    });
                    this.saveDataToFirestore();
                } else if (categoryExists && normalizedOldName !== normalizedNewName) {
                    alert('Já existe uma categoria com este nome.');
                    t.value = oldName;
                }
            }
        });

        const confirmModal = document.getElementById('confirm-recurring-delete-modal');
        document.getElementById('delete-all-recurring-btn').addEventListener('click', () => {
            const id = parseFloat(confirmModal.dataset.recurringId);
            const index = parseInt(confirmModal.dataset.recurringIndex);
            App.handleRecurringDeletion(id, 0);
            App.state.recurringEntries.splice(index, 1);
            App.render.renderRecurringList();
            App.showMonth(App.state.activeMonthIndex);
            App.saveDataToFirestore();
            confirmModal.classList.add('hidden');
        });
        document.getElementById('delete-future-recurring-btn').addEventListener('click', () => {
            const id = parseFloat(confirmModal.dataset.recurringId);
            const index = parseInt(confirmModal.dataset.recurringIndex);
            App.handleRecurringDeletion(id, App.state.activeMonthIndex);
            App.state.recurringEntries.splice(index, 1);
            App.render.renderRecurringList();
            App.showMonth(App.state.activeMonthIndex);
            App.saveDataToFirestore();
            confirmModal.classList.add('hidden');
        });
        document.getElementById('cancel-delete-recurring-btn').addEventListener('click', () => {
            confirmModal.classList.add('hidden');
        });
    },

    ai: {
        async getFinancialAnalysis(monthIndex) {
            App.ui.aiAnalysisModal.classList.remove('hidden');
            App.ui.aiAnalysisResult.innerHTML = '<p class="muted-text">Analisando seus dados...</p>';
            try {
                const monthData = App.state.monthlyData[monthIndex];
                if (!monthData) throw new Error("Dados do mês não encontrados.");
                const prompt = `**Contexto, Regras e Funcionalidades do App:**\n1. Você é o assistente de IA da plataforma "Rico Plus".\n2. Você pode dar dicas financeiras gerais, mas ao sugerir ações, SÓ PODE usar as funcionalidades existentes.\n3. Funcionalidades existentes: Lançamento de ganhos/despesas, categorização, metas de gastos, resumos, gráficos, lançamentos recorrentes, gestão de cartões, exportação PDF/CSV.\n4. **NÃO INVENTE** funcionalidades que não existem (ex: notificações).\n5. **NUNCA** mencione apps concorrentes.\n\n**Tarefa:**\nGere um relatório em HTML (sem texto fora do HTML) analisando os dados: ${JSON.stringify(monthData)}.\nO relatório deve conter:\n1. Um resumo dos ganhos e gastos.\n2. A maior categoria de despesa pessoal.\n3. Três sugestões práticas para melhorar a saúde financeira, baseadas nas funcionalidades existentes do Rico Plus.\n`;
                const analysisResult = await this.callVercelFunction(prompt);
                const cleanedResponse = App.helpers.cleanAIResponse(analysisResult);
                App.ui.aiAnalysisResult.innerHTML = cleanedResponse;
            } catch (error) {
                console.error("Erro ao obter análise da IA:", error);
                App.ui.aiAnalysisResult.innerHTML = '<p style="color: var(--red-color);">Ocorreu um erro ao tentar analisar os dados.</p>';
            }
        },
        async getAnnualFinancialAnalysis() {
            App.ui.aiAnalysisModal.classList.remove('hidden');
            App.ui.aiAnalysisResult.innerHTML = '<p class="muted-text">Analisando seus dados anuais...</p>';
            try {
                const annualData = App.state.monthlyData;
                if (!annualData) throw new Error("Dados anuais não encontrados.");
                const prompt = `**Contexto, Regras e Funcionalidades do App:**\n1. Você é o assistente de IA da plataforma "Rico Plus".\n2. Você pode dar dicas financeiras gerais, mas ao sugerir ações, SÓ PODE usar as funcionalidades existentes.\n3. Funcionalidades existentes: Lançamento de ganhos/despesas, categorização, metas de gastos, resumos, gráficos, lançamentos recorrentes, gestão de cartões, exportação PDF/CSV.\n4. **NÃO INVENTE** funcionalidades que não existem (ex: notificações).\n5. **NUNCA** mencione apps concorrentes.\n\n**Tarefa:**\nGere um relatório em HTML (sem texto fora do HTML) analisando os dados anuais: ${JSON.stringify(annualData)}.\nO relatório deve conter:\n1. Um resumo geral dos ganhos, gastos e saldo final do ano.\n2. O mês de maior gasto e o mês de maior ganho.\n3. Três insights estratégicos para o próximo ano.\n`;
                const analysisResult = await this.callVercelFunction(prompt);
                const cleanedResponse = App.helpers.cleanAIResponse(analysisResult);
                App.ui.aiAnalysisResult.innerHTML = cleanedResponse;
            } catch (error) {
                console.error("Erro ao obter análise anual da IA:", error);
                App.ui.aiAnalysisResult.innerHTML = '<p style="color: var(--red-color);">Ocorreu um erro ao tentar analisar os dados anuais.</p>';
            }
        },
        async getChatbotResponse(userMessage) {
            try {
                const financialData = App.state.monthlyData;
                const prompt = `**Contexto, Regras e Funcionalidades do App:**\n1. Você é o assistente de IA da plataforma "Rico Plus". Sua personalidade é prestativa e focada em ajudar.\n2. Você pode dar dicas financeiras gerais e conceituais (ex: importância de poupar).\n3. **REGRA CRÍTICA:** Ao sugerir uma AÇÃO PRÁTICA ou FERRAMENTA, você SÓ PODE se basear na seguinte lista de funcionalidades que REALMENTE EXISTEM no Rico Plus:\n    - Lançamento de ganhos (PJ/PF) e despesas.\n    - Categorização de gastos e definição de metas de orçamento.\n    - Resumos, saldos e gráficos.\n    - Lançamentos recorrentes.\n    - Gerenciamento de cartões de crédito.\n4. **NÃO INVENTE** funcionalidades que não estão na lista (ex: notificações).\n5. **NUNCA** mencione apps concorrentes. Se o usuário pedir uma ferramenta, reforce o uso do Rico Plus.\n\n**Tarefa:**\nResponda à pergunta do usuário: "${userMessage}". Use os dados financeiros a seguir como base: ${JSON.stringify(financialData)}.\nFormate sua resposta de forma clara usando Markdown.\n`;
                const aiResponse = await this.callVercelFunction(prompt);
                const messagesContainer = document.getElementById('chatbot-messages');
                messagesContainer.removeChild(messagesContainer.lastChild);
                const formattedResponse = marked.parse(aiResponse);
                messagesContainer.innerHTML += `<div class="p-3 rounded-lg max-w-[85%] text-sm" style="background-color: var(--secondary-bg);"><p class="font-bold mb-1">Assistente</p><div class="prose dark:prose-invert max-w-none">${formattedResponse}</div></div>`;
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            } catch (error) {
                console.error("Erro na resposta do chatbot:", error);
                const messagesContainer = document.getElementById('chatbot-messages');
                messagesContainer.removeChild(messagesContainer.lastChild);
                messagesContainer.innerHTML += `<div class="p-3 rounded-lg max-w-[85%] text-sm" style="background-color: var(--secondary-bg);"><p class="font-bold mb-1">Assistente</p><p>Desculpe, não consegui processar sua pergunta. Tente novamente.</p></div>`;
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
        },
        async getCategorySuggestion(description, entryId, button) {
            const originalContent = button.innerHTML;
            button.innerHTML = '...';
            button.disabled = true;
            try {
                const availableCategories = App.state.categories.map(c => c.name).join(', ');
                const prompt = `Analise a despesa: "${description}".\nQual das seguintes categorias melhor se encaixa? Categorias disponíveis: [${availableCategories}].\nResponda APENAS com o nome exato de uma das categorias da lista. Sem frases, apenas a categoria.`;
                let suggestedCategory = await this.callVercelFunction(prompt);
                suggestedCategory = suggestedCategory.trim().replace(/["'.]/g, '');
                const entryElement = button.closest('.expense-entry-row');
                const selectElement = entryElement.querySelector('[data-field="category"]');
                const categoryExists = App.state.categories.find(c => c.name.toLowerCase() === suggestedCategory.toLowerCase());
                if (selectElement && categoryExists) {
                    selectElement.value = categoryExists.name;
                    const event = new Event('input', { bubbles: true });
                    selectElement.dispatchEvent(event);
                } else {
                    console.warn(`Categoria sugerida "${suggestedCategory}" não é válida ou não foi encontrada.`);
                }
            } catch (error) {
                console.error("Erro ao obter sugestão de categoria:", error);
            } finally {
                button.innerHTML = originalContent;
                button.disabled = false;
            }
        },
        async callVercelFunction(prompt) {
            const VERCEL_API_URL = "https://controledegastos1-0.vercel.app/api/analyze";
            const response = await fetch(VERCEL_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: prompt })
            });
            if (!response.ok) {
                throw new Error(`Erro na API da Vercel: ${response.statusText}`);
            }
            const data = await response.json();
            return data.analysis;
        }
    },

    render: {
        updateHeader() {
            const name = App.state.profile.name?.split(' ')[0] || 'Visitante';
            document.getElementById('greeting-text').textContent = `Olá, ${name}`;
            const hour = new Date().getHours();
            let greeting = 'Boa tarde!';
            if (hour >= 5 && hour < 12) { greeting = 'Bom dia!'; }
            else if (hour >= 18 || hour < 5) { greeting = 'Boa noite!'; }
            document.getElementById('time-greeting').textContent = greeting;
            const avatarUrl = App.state.profile.avatarUrl || 'https://raw.githubusercontent.com/franzoieric-art/controledegastos.franzoitech/main/ricoplus-landing-page/images/default-avatar.svg';
            document.getElementById('user-avatar').src = avatarUrl;
        },
        renderCalendarView(monthIndex) {
            const container = document.getElementById(`calendar-container-${monthIndex}`);
            if (!container) return;
            const year = new Date().getFullYear();
            const firstDay = new Date(year, monthIndex, 1);
            const lastDay = new Date(year, monthIndex + 1, 0);
            const startingDayOfWeek = firstDay.getDay();
            const monthName = App.constants.monthNames[monthIndex];
            let headerHTML = `<div class="calendar-nav-header flex items-center justify-between mb-4 p-2 rounded-xl" style="background-color: var(--input-bg);"><button class="calendar-nav-btn" data-action="prev-month" title="Mês Anterior">‹</button><div class="flex flex-col sm:flex-row items-center gap-1 sm:gap-4"><h3 class="text-lg font-semibold text-center">${monthName} ${year}</h3><button class="px-3 py-1 text-xs font-semibold rounded-lg" style="background-color: var(--secondary-bg); color: var(--secondary-text);" data-action="show-annual">Balanço Anual</button></div><button class="calendar-nav-btn" data-action="next-month" title="Próximo Mês">›</button></div>`;
            let gridHTML = '<div class="calendar-grid">';
            ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].forEach(day => { gridHTML += `<div class="calendar-header">${day}</div>`; });
            for (let i = 0; i < startingDayOfWeek; i++) { gridHTML += '<div></div>'; }
            for (let day = 1; day <= lastDay.getDate(); day++) {
                const dayData = App.state.monthlyData[monthIndex].expenses[day - 1];
                let classes = 'calendar-day current-month';
                if (dayData && (dayData.personalEntries.length > 0 || dayData.businessEntries.length > 0)) { classes += ' has-entries'; }
                gridHTML += `<div class="${classes}" data-day="${day - 1}">${day}</div>`;
            }
            gridHTML += '</div>';
            container.innerHTML = headerHTML + gridHTML;
        },
        createMonthContentHTML: (monthIndex) => { return `<div id="month-${monthIndex}-content" class="month-content"><div class="flex justify-end gap-2 mb-4"><button class="export-csv-btn px-4 py-2 text-sm font-semibold rounded-lg" style="background-color: var(--secondary-bg); color: var(--secondary-text);" data-month-index="${monthIndex}">Exportar CSV</button><button class="export-pdf-btn px-4 py-2 text-sm font-semibold rounded-lg" style="background-color: var(--secondary-bg); color: var(--secondary-text);" data-month-index="${monthIndex}">Exportar PDF</button></div><div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8"><div class="lg:col-span-1 p-5 rounded-2xl card border-t-4 border-yellow-400"><h2 class="text-xl font-semibold mb-4">Ganhos Pessoa Jurídica</h2><div id="pj-entries-container-${monthIndex}" class="flex flex-col gap-3 mb-3"></div><button class="add-entry-btn mt-2 w-full py-2 text-sm font-semibold rounded-lg" style="background-color: var(--secondary-bg); color: var(--secondary-text);" data-month-index="${monthIndex}" data-type="pj">+ Adicionar Ganho PJ</button></div><div class="lg:col-span-1 p-5 rounded-2xl card border-t-4 border-green-400"><h2 class="text-xl font-semibold mb-4">Ganhos Pessoa Física</h2><div id="pf-entries-container-${monthIndex}" class="flex flex-col gap-3 mb-3"></div><button class="add-entry-btn mt-2 w-full py-2 text-sm font-semibold rounded-lg" style="background-color: var(--secondary-bg); color: var(--secondary-text);" data-month-index="${monthIndex}" data-type="pf">+ Adicionar Ganho PF</button></div><div class="lg:col-span-1 grid gap-6"><div><div class="p-5 rounded-2xl card border-t-4 border-blue-400 space-y-4"><div class="space-y-1"><label class="block text-sm font-medium muted-text">Caixa da empresa:</label><p id="companyCash-${monthIndex}" class="text-2xl font-semibold">R$ 0,00</p></div><div class="space-y-1"><label class="block text-sm font-medium muted-text">Caixa pessoal:</label><p id="personalCash-${monthIndex}" class="text-2xl font-semibold">R$ 0,00</p></div></div></div><div><div id="summary-card-${monthIndex}" class="p-5 rounded-2xl card border-t-4 border-purple-400"><h2 class="text-xl font-semibold mb-4">Resumo do Mês</h2><div class="space-y-2 text-sm"><div class="flex justify-between items-center"><span>Gasto Pessoal:</span><span id="totalPersonalExpenses-${monthIndex}" class="font-semibold" style="color: var(--red-color);">R$ 0,00</span></div><div class="flex justify-between items-center"><span>Gasto Empresa:</span><span id="totalBusinessExpenses-${monthIndex}" class="font-semibold" style="color: var(--red-color);">R$ 0,00</span></div><div class="flex justify-between items-center pt-2 border-t" style="border-color: var(--border-color);"><span>Saldo Pessoal:</span><span id="remainingPersonal-${monthIndex}" class="font-semibold">R$ 0,00</span></div><div class="flex justify-between items-center"><span>Saldo Empresa:</span><span id="remainingBusiness-${monthIndex}" class="font-semibold">R$ 0,00</span></div><div class="flex justify-between items-center border-t pt-2 mt-2" style="border-color: var(--border-color);"><span class="font-semibold">Saldo Total:</span><span id="remainingTotal-${monthIndex}" class="text-xl font-bold">R$ 0,00</span></div></div><div id="budget-alerts-${monthIndex}" class="mt-3 text-xs"></div></div></div></div></div><div class="text-center mb-4"><button class="ai-analysis-btn px-5 py-2 text-white font-semibold rounded-xl shadow-sm transition-colors" style="background-color: var(--primary-color);" onmouseover="this.style.backgroundColor=getComputedStyle(this).getPropertyValue('--primary-color-hover')" onmouseout="this.style.backgroundColor=getComputedStyle(this).getPropertyValue('--primary-color')" data-month-index="${monthIndex}">Analisar Mês com IA ✨</button></div><div id="calendar-container-${monthIndex}" class="mb-8"></div><div id="expense-section-wrapper-${monthIndex}" class=""><div id="expense-accordion-container-${monthIndex}" class="space-y-2 mb-8"></div></div><div class="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-8"><div class="card p-6 rounded-2xl"><h2 class="text-xl font-semibold text-center mb-4">Balanço do Mês</h2><div class="relative mx-auto" style="max-width: 300px; height: 300px;"><canvas id="budgetPieChart-${monthIndex}"></canvas></div></div><div class="card p-6 rounded-2xl"><h2 class="text-xl font-semibold text-center mb-4">Gastos por Pagamento</h2><div class="relative mx-auto" style="max-width: 300px; height: 300px;"><canvas id="paymentMethodChart-${monthIndex}"></canvas></div></div><div class="card p-6 rounded-2xl"><h2 class="text-xl font-semibold text-center mb-4">Metas de Gastos (Pessoal)</h2><div class="relative mx-auto" style="height: 300px;"><canvas id="budgetGoalsChart-${monthIndex}"></canvas></div></div></div></div>` },
        createBalanceContentHTML: () => { return `<div id="month-12-content" class="month-content"><div class="flex items-center justify-center gap-4 mb-8"><h2 class="text-3xl font-bold">Balanço Anual</h2><button class="px-3 py-1.5 text-sm font-semibold rounded-lg" style="background-color: var(--secondary-bg); color: var(--secondary-text);" data-action="back-to-months">← Voltar</button></div><div class="text-center mb-8 -mt-4"><button id="ai-annual-analysis-btn" class="px-5 py-2 text-white font-semibold rounded-xl shadow-sm transition-colors" style="background-color: var(--primary-color);">Analisar Ano com IA ✨</button></div><div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 text-center"><div class="card border-t-4 border-yellow-400 p-5 rounded-2xl"><span class="block text-sm muted-text mb-2">Total Ganhos PJ</span><span id="totalAnnualPJ" class="text-2xl font-semibold">R$ 0,00</span></div><div class="card border-t-4 border-green-400 p-5 rounded-2xl"><span class="block text-sm muted-text mb-2">Total Ganhos PF</span><span id="totalAnnualPF" class="text-2xl font-semibold">R$ 0,00</span></div><div class="card border-t-4 border-red-400 p-5 rounded-2xl"><span class="block text-sm muted-text mb-2">Gastos Totais</span><span id="totalAnnualExpenses" class="text-2xl font-semibold">R$ 0,00</span></div><div class="card border-t-4 border-blue-400 p-5 rounded-2xl"><span class="block text-sm muted-text mb-2">Saldo Final</span><span id="annualBalance" class="text-2xl font-bold">R$ 0,00</span><p id="annualPerformance" class="text-lg font-semibold mt-1"></p></div></div><div class="grid grid-cols-1 lg:grid-cols-2 gap-6"><div class="card p-6 rounded-2xl lg:col-span-2"><h3 class="text-xl font-semibold text-center mb-4">Desempenho Mensal</h3><div class="relative mx-auto" style="height: 400px;"><canvas id="monthlyPerformanceBarChart"></canvas></div></div><div class="card p-6 rounded-2xl"><h3 class="text-xl font-semibold text-center mb-4">Maiores Gastos do Ano (Top 5)</h3><div id="top-spends-container" class="text-sm space-y-2 max-h-96 overflow-y-auto p-2"></div></div></div></div>` },
        createEntryElement: (config) => {
            const { monthIndex, dayIndex, category, entry, type } = config;
            const d = document.createElement('div');
            d.classList.add('flex', 'items-center', 'gap-2', 'w-full', 'flex-wrap', 'expense-entry-row');
            let r = '', p = '', c = '', s = '', aiBtn = '';
            if (type === 'expense') {
                r = `<button class="remove-btn" data-type="expense" data-month-index="${monthIndex}" data-day="${dayIndex}" data-category="${category}" data-entry-id="${entry.id}">×</button>`;
                p = `<select class="entry-input p-2 input-field text-sm w-full sm:w-auto" data-field="paymentMethod">${App.constants.basePaymentMethods.map(m => `<option value="${m}" ${entry.paymentMethod === m ? 'selected' : ''}>${m}</option>`).join('')}</select>`;
                if (entry.paymentMethod === 'Crédito') { c = `<select class="entry-input p-2 input-field text-sm w-full sm:w-auto" data-field="card">${App.state.creditCards.map(c => `<option value="${c}" ${entry.card === c ? 'selected' : ''}>${c}</option>`).join('')}</select>`; }
                s = `<select class="entry-input p-2 input-field text-sm w-full sm:w-auto" data-field="category">${App.state.categories.map(c => `<option value="${c.name}" ${entry.category === c.name ? 'selected' : ''}>${c.name}</option>`).join('')}</select>`;
                aiBtn = `<div class="tooltip-container"><button class="suggest-category-btn flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-xl" style="background-color: var(--secondary-bg); color: var(--secondary-text);">✨</button><span class="tooltip-text">Sugerir categoria com IA</span></div>`;
            } else {
                r = `<button class="remove-btn" data-type="${type}" data-month-index="${monthIndex}" data-entry-id="${entry.id}">×</button>`;
            }
            d.innerHTML = `<input type="text" value="${entry.description}" placeholder="Descrição" class="entry-input flex-grow p-2 input-field text-sm" data-field="description"><input type="number" value="${entry.amount}" min="0" step="0.01" placeholder="0,00" class="entry-input w-28 p-2 input-field text-sm" data-field="amount">${s}${aiBtn}${p}<span class="card-selector-container">${c}</span>${r}`;
            return d;
        },
        renderPJEntries: (m) => { const c = document.getElementById(`pj-entries-container-${m}`); if (!c) return; c.innerHTML = ''; App.state.monthlyData[m].pjEntries.forEach(e => c.appendChild(App.render.createEntryElement({ monthIndex: m, entry: e, type: 'pj' }))); },
        renderPFEntries: (m) => { const c = document.getElementById(`pf-entries-container-${m}`); if (!c) return; c.innerHTML = ''; App.state.monthlyData[m].pfEntries.forEach(e => c.appendChild(App.render.createEntryElement({ monthIndex: m, entry: e, type: 'pf' }))); },
        renderExpenseTable: (m) => { const container = document.getElementById(`expense-accordion-container-${m}`); if (!container) return; container.innerHTML = ''; for (let day = 0; day < 31; day++) { const item = document.createElement('div'); item.className = 'accordion-item card rounded-xl overflow-hidden'; item.innerHTML = `<div class="accordion-trigger flex justify-between items-center p-4 cursor-pointer" style="background-color: var(--input-bg);"><span class="font-semibold">Dia ${day + 1}</span><span class="arrow text-xl muted-text">▼</span></div><div class="accordion-content"><div class="grid grid-cols-1 md:grid-cols-2 gap-6"><div><h3 class="font-semibold mb-3">Gastos Pessoais</h3><div id="personal-entries-${m}-${day}" class="flex flex-col gap-3"></div><button class="add-entry-btn mt-3 px-3 py-1.5 text-sm font-semibold rounded-lg" style="background-color: var(--secondary-bg); color: var(--secondary-text);" data-month-index="${m}" data-day="${day}" data-type="expense" data-category="personal">+ Gasto Pessoal</button></div><div><h3 class="font-semibold mb-3">Gastos da Empresa</h3><div id="business-entries-${m}-${day}" class="flex flex-col gap-3"></div><button class="add-entry-btn mt-3 px-3 py-1.5 text-sm font-semibold rounded-lg" style="background-color: var(--secondary-bg); color: var(--secondary-text);" data-month-index="${m}" data-day="${day}" data-type="expense" data-category="business">+ Gasto Empresa</button></div></div></div>`; container.appendChild(item); ['personal', 'business'].forEach(type => { const entriesContainer = item.querySelector(`#${type}-entries-${m}-${day}`); App.state.monthlyData[m].expenses[day][`${type}Entries`].forEach(e => entriesContainer.appendChild(App.render.createEntryElement({ monthIndex: m, dayIndex: day, category: type, entry: e, type: 'expense' }))); }); } },
        updateBudgetAlerts: (m) => { const c = document.getElementById(`budget-alerts-${m}`); if (!c) return; const expenses = App.state.categories.reduce((a, cat) => ({...a, [cat.name]: 0 }), {}); App.state.monthlyData[m].expenses.forEach(d => { d.personalEntries.forEach(e => { if (expenses[e.category] !== undefined) expenses[e.category] += e.amount; }); }); const alerts = App.state.categories.map(cat => (expenses[cat.name] > cat.budget && cat.budget > 0) ? `<li style="color: var(--red-color);">${cat.name}: ${App.helpers.formatCurrency(expenses[cat.name] - cat.budget)} acima da meta.</li>` : '').filter(Boolean); c.innerHTML = alerts.length > 0 ? `<p class="font-semibold mt-2">Atenção ao Orçamento:</p><ul class="list-disc list-inside ml-4">${alerts.join('')}</ul>` : ''; },
        updateAllCharts: (m, totals) => {
            const chartTextColor = getComputedStyle(document.documentElement).getPropertyValue('--text-color');
            const gridColor = getComputedStyle(document.documentElement).getPropertyValue('--border-color');
            const options = { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: chartTextColor, font: { family: 'Inter' } } } } };
            const barOptions = {...options, scales: { y: { ticks: { color: chartTextColor }, grid: { color: gridColor } }, x: { ticks: { color: chartTextColor }, grid: { color: gridColor } } } };
            if (App.state.chartInstances.pie) App.state.chartInstances.pie.destroy();
            App.state.chartInstances.pie = new Chart(document.getElementById(`budgetPieChart-${m}`).getContext('2d'), { type: 'pie', data: { labels: ['Pessoais', 'Empresa', 'Saldo'], datasets: [{ data: [totals.totalPersonal, totals.totalBusiness, Math.max(0, totals.remainingBudget)], backgroundColor: ['#ff453a', '#32d74b', '#2997ff'] }] }, options });
            const paymentLabels = [...App.constants.basePaymentMethods.filter(m => m !== 'Crédito'), ...App.state.creditCards.map(c => `Crédito (${c})`)];
            const paymentTotals = Object.fromEntries(paymentLabels.map(l => [l, 0]));
            App.state.monthlyData[m].expenses.forEach(d => {
                [...d.personalEntries, ...d.businessEntries].forEach(e => { let k = e.paymentMethod === 'Crédito' ? `Crédito (${e.card})` : e.paymentMethod; if (paymentTotals[k] !== undefined) paymentTotals[k] += e.amount; }); });
            const paymentColors = ['#007BFF', '#FD7E14', '#DC3545', '#20C997', '#6F42C1', '#D63384', '#198754', '#6C757D'];
            if (App.state.chartInstances.payment) App.state.chartInstances.payment.destroy();
            App.state.chartInstances.payment = new Chart(document.getElementById(`paymentMethodChart-${m}`).getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: paymentLabels,
                    datasets: [{
                        data: Object.values(paymentTotals),
                        backgroundColor: paymentColors,
                        borderColor: getComputedStyle(document.documentElement).getPropertyValue('--card-bg'),
                        borderWidth: 2
                    }]
                },
                options
            });
            const expensesByCategory = App.state.categories.reduce((a, c) => ({...a, [c.name]: 0 }), {});
            App.state.monthlyData[m].expenses.forEach(d => { d.personalEntries.forEach(e => { if (expensesByCategory[e.category] !== undefined) expensesByCategory[e.category] += e.amount; }); });
            const spentData = App.state.categories.map(c => expensesByCategory[c.name]);
            const budgetData = App.state.categories.map(c => c.budget);
            const barColors = spentData.map((s, i) => (s > budgetData[i] && budgetData[i] > 0) ? '#ff9500' : '#ff453a');
            if (App.state.chartInstances.goals) App.state.chartInstances.goals.destroy();
            App.state.chartInstances.goals = new Chart(document.getElementById(`budgetGoalsChart-${m}`).getContext('2d'), { type: 'bar', data: { labels: App.state.categories.map(c => c.name), datasets: [{ label: 'Gasto', data: spentData, backgroundColor: barColors }, { label: 'Meta', data: budgetData, backgroundColor: '#2997ff' }] }, options: {...barOptions, indexAxis: 'y' } });
        },
        renderBalanceSummary: () => { let totals = { pj: 0, pf: 0, personal: 0, business: 0 }; let monthlyPerformance = { gains: [], expenses: [] }; let allPersonalSpends = []; for (let i = 0; i < 12; i++) { if (!App.state.monthlyData[i]) { monthlyPerformance.gains.push(0); monthlyPerformance.expenses.push(0); continue; }; const monthData = App.state.monthlyData[i]; let monthGains = 0; let monthExpenses = 0; monthData.pjEntries.forEach(e => { totals.pj += e.amount; monthGains += e.amount; }); monthData.pfEntries.forEach(e => { totals.pf += e.amount; monthGains += e.amount; }); monthData.expenses.forEach(day => { day.personalEntries.forEach(e => { totals.personal += e.amount; monthExpenses += e.amount; if (e.amount > 0) allPersonalSpends.push({...e, month: i }); }); day.businessEntries.forEach(e => { totals.business += e.amount; monthExpenses += e.amount; }); }); monthlyPerformance.gains.push(monthGains); monthlyPerformance.expenses.push(monthExpenses); } const balance = (totals.pj + totals.pf) - (totals.personal + totals.business); document.getElementById('totalAnnualPJ').textContent = App.helpers.formatCurrency(totals.pj); document.getElementById('totalAnnualPF').textContent = App.helpers.formatCurrency(totals.pf); document.getElementById('totalAnnualExpenses').textContent = App.helpers.formatCurrency(totals.personal + totals.business); document.getElementById('annualBalance').textContent = App.helpers.formatCurrency(balance); const perfEl = document.getElementById('annualPerformance'); perfEl.textContent = balance >= 0 ? 'Positivo' : 'Negativo'; perfEl.style.color = balance >= 0 ? 'var(--green-color)' : 'var(--red-color)'; const top5spends = allPersonalSpends.sort((a, b) => b.amount - a.amount).slice(0, 5); document.getElementById('top-spends-container').innerHTML = top5spends.map(spend => `<div class="p-2 rounded-lg" style="background-color: var(--input-bg);"><strong class="text-color">${spend.category}:</strong> ${App.helpers.formatCurrency(spend.amount)} <span class="text-xs muted-text">(${spend.description} em ${App.constants.monthNames[spend.month]})</span></div>`).join('') || '<p class="muted-text">Nenhum gasto pessoal registrado.</p>'; App.render.updateAnnualCharts(monthlyPerformance); },
        updateAnnualCharts: (performance) => { const chartTextColor = getComputedStyle(document.documentElement).getPropertyValue('--text-color'); const gridColor = getComputedStyle(document.documentElement).getPropertyValue('--border-color'); const barOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: chartTextColor } } }, scales: { y: { ticks: { color: chartTextColor }, grid: { color: gridColor } }, x: { ticks: { color: chartTextColor }, grid: { color: gridColor } } } }; if (App.state.chartInstances.annualBar) App.state.chartInstances.annualBar.destroy(); App.state.chartInstances.annualBar = new Chart(document.getElementById('monthlyPerformanceBarChart').getContext('2d'), { type: 'bar', data: { labels: App.constants.monthNames.slice(0, 12), datasets: [{ label: 'Ganhos Totais', data: performance.gains, backgroundColor: '#32d74b' }, { label: 'Gastos Totais', data: performance.expenses, backgroundColor: '#ff453a' }] }, options: barOptions }); },
        renderCardList: () => { App.ui.cardListContainer.innerHTML = App.state.creditCards.map(c => `<div class="flex items-center justify-between p-2 rounded-lg" style="background-color: var(--input-bg);"><span class="text-color">${c}</span><button class="remove-card-btn text-red-500 hover:text-red-700" data-card-name="${c}">×</button></div>`).join(''); },
        renderCategoryList: () => { App.ui.categoryListContainer.innerHTML = App.state.categories.map(c => `<div class="flex items-center justify-between p-2 rounded-lg gap-2" style="background-color: var(--input-bg);"><input type="text" value="${c.name}" class="category-name-input flex-grow p-1 input-field" data-old-name="${c.name}"><input type="number" value="${c.budget}" min="0" class="category-budget-input w-24 p-1 input-field" data-category-name="${c.name}"><button class="remove-category-btn text-red-500 hover:text-red-700" data-category-name="${c.name}">×</button></div>`).join(''); },
        renderRecurringList: () => { App.ui.recurringListContainer.innerHTML = App.state.recurringEntries.map((r, i) => `<div class="text-xs p-2 rounded-lg flex justify-between items-center" style="background-color: var(--input-bg);"><div><p class="font-bold text-color">${r.description} (${App.helpers.formatCurrency(r.amount)})</p><p class="muted-text">Todo dia ${r.dayOfMonth} - ${r.type}</p></div><button class="remove-recurring-btn text-red-500 hover:text-red-700 font-bold" data-index="${i}">×</button></div>`).join(''); },
        
        renderSettingsModal: () => {
            App.render.renderCardList();
            App.render.renderCategoryList();
            App.render.renderRecurringList();
            const recurringTypes = ['Ganho PF', 'Ganho PJ', 'Gasto Pessoal', 'Gasto Empresa'];
            document.getElementById('recurring-type').innerHTML = recurringTypes.map(type => `<option value="${type}">${type}</option>`).join('');
            document.getElementById('recurring-category').innerHTML = App.state.categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
            document.getElementById('recurring-payment').innerHTML = App.constants.basePaymentMethods.map(m => `<option value="${m}">${m}</option>`).join('');
            document.getElementById('recurring-card').innerHTML = App.state.creditCards.map(c => `<option value="${c}">${c}</option>`).join('');
            App.ui.settingsModal.classList.remove('hidden');
            setTimeout(() => App.ui.settingsModal.querySelector('.modal-content').classList.remove('scale-95'), 10);
        },
        
        renderAccountModal: () => {
            const user = auth.currentUser;
            if (user) {
                App.ui.userNameInput.value = App.state.profile.name || '';
                App.ui.userEmailDisplay.value = user.email || '';
                const wa = App.state.integrations.whatsapp;
                App.ui.whatsappPhoneId.value = wa.phoneNumberId || '';
                App.ui.whatsappToken.value = wa.accessToken || '';
                App.ui.whatsappWebhookUrl.value = `${window.location.origin}/api/whatsapp-webhook`;
                App.ui.whatsappVerifyToken.value = wa.webhookVerifyToken || '';
                if (wa.phoneNumberId && wa.accessToken) {
                    App.ui.whatsappStatus.textContent = 'Configurado';
                    App.ui.whatsappStatus.style.color = 'var(--green-color)';
                } else {
                    App.ui.whatsappStatus.textContent = 'Não configurado';
                    App.ui.whatsappStatus.style.color = 'var(--muted-text)';
                }
                App.ui.accountModal.classList.remove('hidden');
                setTimeout(() => App.ui.accountModal.querySelector('.modal-content').classList.remove('scale-95'), 10);
            }
        },
    }
};

window.App = App;

onAuthStateChanged(auth, user => {
    if (user) {
        authScreen.classList.add('hidden');
        appScreen.classList.remove('hidden');
        loadingOverlay.classList.remove('hidden');
        App.init(user.uid);
    } else {
        App.state.currentUserId = null;
        authScreen.classList.remove('hidden');
        appScreen.classList.add('hidden');
    }
});