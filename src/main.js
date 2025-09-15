// ========================================================================
// PARTE 1: IMPORTS (SEMPRE NO TOPO DO ARQUIVO)
// Corrigido para usar os pacotes do npm, como o Vite espera.
// ========================================================================
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, sendPasswordResetEmail } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

// ========================================================================
// PARTE 2: LÓGICA PRINCIPAL (DENTRO DO 'DOMContentLoaded')
// O código aqui só roda depois que a página HTML inteira foi carregada.
// ========================================================================
document.addEventListener('DOMContentLoaded', () => {

    // --- Configuração do Firebase ---
    const firebaseConfig = {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID
    };

    // --- Inicialização dos Serviços do Firebase ---
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);
    const storage = getStorage(app);

    // --- Seleção de Elementos Globais do DOM ---
    const authScreen = document.getElementById('auth-screen');
    const appScreen = document.getElementById('app-screen');
    const mainAuthBtn = document.getElementById('main-auth-btn');
    const forgotPasswordLink = document.getElementById('forgot-password-link');
    const authError = document.getElementById('auth-error');
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const loadingOverlay = document.getElementById('loading-overlay');

    // --- Lógica de Autenticação (Login, Cadastro, etc.) ---
    let isLoginMode = true;
    const handleAuthKeyPress = (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            mainAuthBtn.click();
        }
    };
    document.getElementById('email-input').addEventListener('keydown', handleAuthKeyPress);
    document.getElementById('password-input').addEventListener('keydown', handleAuthKeyPress);
    document.getElementById('confirm-password-input').addEventListener('keydown', handleAuthKeyPress);
    
    const showError = (message) => {
        authError.textContent = message;
    };
    
    const applyTheme = (theme) => {
        document.documentElement.classList.toggle('dark', theme === 'dark');
        themeToggleBtn.textContent = theme === 'dark' ? '☀️' : '🌙';
        if (window.App && App.state.currentUserId) {
            App.showMonth(App.state.activeMonthIndex);
        }
    };
    applyTheme(localStorage.getItem('theme') || 'light');

    mainAuthBtn.addEventListener('click', () => {
        const email = document.getElementById('email-input').value;
        const password = document.getElementById('password-input').value;
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
                .catch(() => {
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
            createUserWithEmailAndPassword(auth, email, password)
                .catch(error => {
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
        if (!email) {
            showError('Por favor, insira seu email para recuperar a senha.');
            return;
        }
        sendPasswordResetEmail(auth, email)
            .then(() => {
                showError('Email de recuperação enviado!');
            })
            .catch(() => {
                showError('Não foi possível enviar o email.');
            });
    });

    document.getElementById('logout-btn').addEventListener('click', () => {
        signOut(auth);
    });

    // --- Objeto Principal da Aplicação ---
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
            monthContentContainer: document.getElementById('monthContentContainer'),
            settingsModal: document.getElementById('settings-modal'),
            accountModal: document.getElementById('account-modal'),
            userNameInput: document.getElementById('user-name-input'),
            userEmailDisplay: document.getElementById('user-email-display'),
            whatsappPhoneId: document.getElementById('whatsapp-phone-id'),
            whatsappToken: document.getElementById('whatsapp-token'),
            whatsappWebhookUrl: document.getElementById('whatsapp-webhook-url'),
            whatsappVerifyToken: document.getElementById('whatsapp-verify-token'),
            whatsappStatus: document.getElementById('whatsapp-status'),
            newCardNameInput: document.getElementById('new-card-name'),
            cardListContainer: document.getElementById('card-list'),
            newCategoryNameInput: document.getElementById('new-category-name'),
            categoryListContainer: document.getElementById('category-list'),
            recurringListContainer: document.getElementById('recurring-list'),
            saveFeedback: document.getElementById('save-feedback'),
            aiAnalysisModal: document.getElementById('ai-analysis-modal'),
            aiAnalysisResult: document.getElementById('ai-analysis-result'),
        },
        constants: {
            monthNames: ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro", "Balanço Anual"],
            basePaymentMethods: ['Pix', 'Débito', 'Crédito', 'Dinheiro', 'Outro']
        },
        init(userId) {
            this.state.currentUserId = userId;
            this.loadData();
            this.bindGlobalEventListeners();
        },
        helpers: {
            formatCurrency: (value) => `R$ ${Number(value).toFixed(2).replace('.', ',')}`,
            debounce(func, delay) {
                return (...args) => {
                    clearTimeout(App.state.saveTimeout);
                    App.state.saveTimeout = setTimeout(() => {
                        func.apply(this, args);
                    }, delay);
                };
            },
            showSaveFeedback() {
                App.ui.saveFeedback.classList.add('show');
                setTimeout(() => {
                    App.ui.saveFeedback.classList.remove('show');
                }, 2000);
            },
            cleanAIResponse(text) {
                if (typeof text !== 'string') return '';
                let cleanedText = text.replace(/```html|```/g, '');
                const firstTagIndex = cleanedText.indexOf('<');
                if (firstTagIndex > -1) {
                    cleanedText = cleanedText.substring(firstTagIndex);
                }
                const noiseKeywords = ["Observações:", "Como usar:", "Cálculo dos Totais:", "Formatação HTML:", "Personalização das Sugestões:"];
                for (const keyword of noiseKeywords) {
                    const noiseIndex = cleanedText.indexOf(keyword);
                    if (noiseIndex > 50) {
                        cleanedText = cleanedText.substring(0, noiseIndex);
                    }
                }
                return cleanedText.trim();
            },
            generateRandomToken() {
                return [...Array(32)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
            }
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
                await setDoc(doc(db, 'users', App.state.currentUserId), dataToSave, {
                    merge: true
                });
                App.helpers.showSaveFeedback();
            } catch (e) {
                console.error("Erro ao salvar dados: ", e);
            }
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
                    this.state.monthlyData[i] = this.state.monthlyData[i] || { pjEntries: [], pfEntries: [], expenses: Array(31).fill(null).map(() => ({ personalEntries: [], businessEntries: [] })) };
                    this.state.monthlyData[i].expenses.forEach(day => {
                        [...day.personalEntries, ...day.businessEntries].forEach(entry => {
                            if (!entry.category) {
                                entry.category = 'Outros';
                            }
                        });
                    });
                }
            } catch (error) {
                console.error("Erro ao carregar dados:", error);
            }
            this.ui.monthContentContainer.innerHTML = '';
            this.constants.monthNames.forEach((_, index) => {
                this.ui.monthContentContainer.insertAdjacentHTML('beforeend', index === 12 ? this.render.createBalanceContentHTML() : this.render.createMonthContentHTML(index));
            });
            this.showMonth(this.state.activeMonthIndex);
            loadingOverlay.classList.add('hidden');
            this.render.updateHeader();
        },
        handleRecurringDeletion(recurringId, startingMonthIndex = 0) {
            for (let i = startingMonthIndex; i < 12; i++) {
                const monthData = this.state.monthlyData[i];
                if (!monthData) continue;
                monthData.pjEntries = monthData.pjEntries.filter(entry => entry.recurringId !== recurringId);
                monthData.pfEntries = monthData.pfEntries.filter(entry => entry.recurringId !== recurringId);
                monthData.expenses.forEach(day => {
                    if (day.personalEntries) {
                        day.personalEntries = day.personalEntries.filter(entry => entry.recurringId !== recurringId);
                    }
                    if (day.businessEntries) {
                        day.businessEntries = day.businessEntries.filter(entry => entry.recurringId !== recurringId);
                    }
                });
            }
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
            if (monthIndex < 12) {
                this.applyRecurringEntries(monthIndex);
            }
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
            this.render.updateAllCharts(m, {
                totalPersonal: t.personal,
                totalBusiness: t.business,
                remainingBudget: t.remainingTotal
            });
        },
        applyRecurringEntries(monthIndex) {
            if (!this.state.monthlyData[monthIndex]) return;
            let wasModified = false;
            const appliedRecurringIds = new Set();
            const month = this.state.monthlyData[monthIndex];
            month.pfEntries.forEach(e => {
                if (e.recurringId) appliedRecurringIds.add(e.recurringId);
            });
            month.pjEntries.forEach(e => {
                if (e.recurringId) appliedRecurringIds.add(e.recurringId);
            });
            month.expenses.forEach(day => {
                day.personalEntries.forEach(e => {
                    if (e.recurringId) appliedRecurringIds.add(e.recurringId);
                });
                day.businessEntries.forEach(e => {
                    if (e.recurringId) appliedRecurringIds.add(e.recurringId);
                });
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
                        Object.assign(newEntry, {
                            category: r.category,
                            paymentMethod: r.paymentMethod,
                            card: r.card
                        });
                        month.expenses[dayIndex].personalEntries.push(newEntry);
                        wasModified = true;
                    } else if (r.type === "Gasto Empresa") {
                        Object.assign(newEntry, {
                            category: 'N/A',
                            paymentMethod: r.paymentMethod,
                            card: r.card
                        });
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
            /* ... (código existente, sem alterações) ... */
        },
        exportMonthToPDF(monthIndex) {
            /* ... (código existente, sem alterações) ... */
        },
        bindGlobalEventListeners() {
            this.debouncedSave = this.helpers.debounce(this.saveDataToFirestore, 750);
            const chatbotModal = document.getElementById('chatbot-modal');
            const chatbotModalContent = chatbotModal.querySelector('.modal-content');
            document.getElementById('floating-chatbot-btn').addEventListener('click', () => {
                chatbotModal.classList.remove('hidden');
                setTimeout(() => {
                    chatbotModal.style.opacity = '1';
                    chatbotModalContent.style.transform = 'translateY(0)';
                }, 10);
            });
            const closeChatbot = () => {
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
                    messagesContainer.innerHTML += `
                <div class="flex justify-end">
                    <div class="p-3 rounded-lg max-w-[85%] text-sm text-white" style="background-color: var(--primary-color);">
                        <p class="font-bold mb-1">Você</p>
                        <p>${userMessage}</p>
                    </div>
                </div>
            `;
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                    setTimeout(() => {
                        messagesContainer.innerHTML += `
                    <div class="p-3 rounded-lg max-w-[85%] text-sm" style="background-color: var(--secondary-bg);">
                        <p class="font-bold mb-1">Assistente</p>
                        <p class="italic">Pensando...</p>
                    </div>
                `;
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
            document.getElementById('manage-settings-btn').addEventListener('click', () => {
                this.render.renderSettingsModal();
            });
            document.getElementById('close-modal-btn').addEventListener('click', () => {
                this.ui.settingsModal.classList.add('hidden');
                this.showMonth(this.state.activeMonthIndex);
            });
            document.getElementById('manage-account-btn').addEventListener('click', () => {
                this.render.renderAccountModal();
            });
            document.getElementById('close-account-modal-btn').addEventListener('click', () => {
                this.ui.accountModal.classList.add('hidden');
            });
            document.getElementById('save-profile-btn').addEventListener('click', () => {
                App.state.profile.name = App.ui.userNameInput.value;
                App.saveDataToFirestore();
                App.ui.accountModal.classList.add('hidden');
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
                setTimeout(() => {
                    e.target.textContent = 'Copiar';
                }, 2000);
            });
            document.getElementById('close-ai-modal-btn').addEventListener('click', () => {
                this.ui.aiAnalysisModal.classList.add('hidden');
            });
            document.getElementById('add-card-btn').addEventListener('click', () => {
                const n = this.ui.newCardNameInput.value.trim();
                if (n && !this.state.creditCards.includes(n)) {
                    this.state.creditCards.push(n);
                    this.ui.newCardNameInput.value = '';
                    this.render.renderCardList();
                    this.saveDataToFirestore();
                }
            });
            document.getElementById('add-category-btn').addEventListener('click', () => {
                const newName = this.ui.newCategoryNameInput.value.trim();
                const normalizedNewName = newName.toLowerCase();
                if (newName && !this.state.categories.some(c => c.name.toLowerCase() === normalizedNewName)) {
                    this.state.categories.push({
                        name: newName,
                        budget: 0
                    });
                    this.ui.newCategoryNameInput.value = '';
                    this.render.renderCategoryList();
                    this.saveDataToFirestore();
                } else if (newName) {
                    alert('Já existe uma categoria com este nome.');
                }
            });
            document.getElementById('recurring-type').addEventListener('change', (e) => {
                document.getElementById('recurring-expense-fields').classList.toggle('hidden', !e.target.value.includes('Gasto'));
            });
            document.getElementById('recurring-payment').addEventListener('change', (e) => {
                document.getElementById('recurring-card').classList.toggle('hidden', e.target.value !== 'Crédito');
            });
            document.getElementById('add-recurring-btn').addEventListener('click', () => {
                const newRec = {
                    id: Date.now(),
                    description: document.getElementById('recurring-desc').value,
                    amount: parseFloat(document.getElementById('recurring-amount').value) || 0,
                    dayOfMonth: parseInt(document.getElementById('recurring-day').value) || 1,
                    type: document.getElementById('recurring-type').value
                };
                if (!newRec.description || newRec.amount <= 0) {
                    alert('Preencha descrição e valor.');
                    return;
                }
                if (newRec.type.includes('Gasto')) {
                    newRec.category = document.getElementById('recurring-category').value;
                    newRec.paymentMethod = document.getElementById('recurring-payment').value;
                    newRec.card = newRec.paymentMethod === 'Crédito' ? document.getElementById('recurring-card').value : '';
                }
                this.state.recurringEntries.push(newRec);
                this.render.renderRecurringList();
                this.saveDataToFirestore();
                document.getElementById('recurring-form').querySelectorAll('input, select').forEach(el => el.value = '');
            });
            document.body.addEventListener('click', (event) => {
                const t = event.target;
                const navBtn = t.closest('.calendar-nav-btn, [data-action="show-annual"]');
                if (navBtn) {
                    const action = navBtn.dataset.action;
                    const currentMonth = App.state.activeMonthIndex;
                    if (action === 'show-annual') {
                        App.state.lastViewedMonthIndex = currentMonth;
                        App.showMonth(12);
                    } else if (action === 'prev-month') {
                        const prevMonth = (currentMonth - 1 + 12) % 12;
                        App.showMonth(prevMonth);
                    } else if (action === 'next-month') {
                        const nextMonth = (currentMonth + 1) % 12;
                        App.showMonth(nextMonth);
                    }
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
                if (t.matches('#copy-pix-btn')) {
                    const pixKey = document.getElementById('pix-key').textContent;
                    navigator.clipboard.writeText(pixKey).then(() => {
                        t.textContent = 'Copiado!';
                        setTimeout(() => {
                            t.textContent = 'Copiar';
                        }, 2000);
                    });
                }
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
                    const {
                        monthIndex,
                        type,
                        day,
                        category
                    } = t.dataset;
                    const month = parseInt(monthIndex);
                    const entries = (type === 'pj') ? this.state.monthlyData[month].pjEntries : (type === 'pf') ? this.state.monthlyData[month].pfEntries : this.state.monthlyData[month].expenses[parseInt(day)][`${category}Entries`];
                    if (type === 'pj' || type === 'pf') {
                        const newEntry = {
                            id: Date.now(),
                            description: '',
                            amount: 0
                        };
                        entries.push(newEntry);
                        document.getElementById(`${type}-entries-container-${month}`).appendChild(this.render.createEntryElement({
                            monthIndex: month,
                            entry: newEntry,
                            type: type
                        }));
                    } else if (type === 'expense') {
                        const n = {
                            id: Date.now(),
                            description: '',
                            amount: 0,
                            paymentMethod: 'Pix',
                            card: this.state.creditCards.length > 0 ? this.state.creditCards[0] : '',
                            category: this.state.categories[0].name
                        };
                        entries.push(n);
                        document.getElementById(`${category}-entries-${month}-${day}`).appendChild(this.render.createEntryElement({
                            monthIndex: month,
                            dayIndex: parseInt(day),
                            category,
                            entry: n,
                            type: 'expense'
                        }));
                    }
                    this.recalculateAndDisplayTotals(month);
                    this.saveDataToFirestore();
                }
                if (t.matches('.remove-btn')) {
                    const {
                        monthIndex,
                        type,
                        day,
                        category,
                        entryId
                    } = t.dataset;
                    const month = parseInt(monthIndex);
                    const id = parseFloat(entryId);
                    if (type === 'pj') {
                        this.state.monthlyData[month].pjEntries = this.state.monthlyData[month].pjEntries.filter(e => e.id !== id);
                    } else if (type === 'pf') {
                        this.state.monthlyData[month].pfEntries = this.state.monthlyData[month].pfEntries.filter(e => e.id !== id);
                    } else {
                        this.state.monthlyData[month].expenses[parseInt(day)][`${category}Entries`] = this.state.monthlyData[month].expenses[parseInt(day)][`${category}Entries`].filter(e => e.id !== id);
                    }
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
                    if (typeof lastMonth === 'number') {
                        App.showMonth(lastMonth);
                    } else {
                        App.showMonth(new Date().getMonth());
                    }
                }
            });
            document.body.addEventListener('input', (event) => {
                const t = event.target;
                if (t.matches('.entry-input')) {
                    const el = t.closest('.expense-entry-row');
                    const btn = el.querySelector('.remove-btn');
                    if (!btn) return;
                    const {
                        monthIndex,
                        type,
                        day,
                        category,
                        entryId
                    } = btn.dataset;
                    const month = parseInt(monthIndex);
                    const id = parseFloat(entryId);
                    let entry;
                    if (type === 'pj') {
                        entry = this.state.monthlyData[month].pjEntries.find(e => e.id === id);
                    } else if (type === 'pf') {
                        entry = this.state.monthlyData[month].pfEntries.find(e => e.id === id);
                    } else {
                        entry = this.state.monthlyData[month].expenses[parseInt(day)][`${category}Entries`].find(e => e.id === id);
                    }
                    if (entry) {
                        const field = t.dataset.field;
                        if (field === 'amount') {
                            entry.amount = parseFloat(t.value) || 0;
                        } else {
                            entry[field] = t.value;
                        }
                        if (field === 'paymentMethod') {
                            this.showMonth(month);
                        } else {
                            this.recalculateAndDisplayTotals(month);
                        }
                        this.debouncedSave();
                    }
                }
                if (t.matches('.category-budget-input')) {
                    const cat = this.state.categories.find(c => c.name === t.dataset.categoryName);
                    if (cat) {
                        cat.budget = parseFloat(t.value) || 0;
                        this.debouncedSave();
                    }
                }
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
        ai: { /* ... código da IA ... */ },
        render: { /* ... código de renderização ... */ }
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

});