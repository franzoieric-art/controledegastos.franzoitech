import { doc, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { db } from './config.js';

// Função para carregar os dados do usuário ou criar um novo documento se não existir
export async function loadUserData(userId) {
    const userDocRef = doc(db, 'users', userId);
    const docSnap = await getDoc(userDocRef);

    if (docSnap.exists()) {
        return docSnap.data();
    } else {
        // Cria um novo documento com dados padrão
        const defaultData = {
            profile: { name: '' },
            integrations: { whatsapp: { phoneNumberId: '', accessToken: '', webhookVerifyToken: '' } },
            creditCards: [],
            categories: [
                { name: 'Alimentação', budget: 500 }, { name: 'Transporte', budget: 150 },
                { name: 'Moradia', budget: 1500 }, { name: 'Lazer', budget: 300 },
                { name: 'Saúde', budget: 200 }, { name: 'Outros', budget: 100 }
            ],
            recurringEntries: [],
            monthlyData: {}
        };
        await setDoc(userDocRef, defaultData);
        return defaultData;
    }
}

// Função otimizada para salvar todo o estado (usar com cautela)
export async function saveFullUserData(userId, data) {
    if (!userId) return;
    const userDocRef = doc(db, 'users', userId);
    await setDoc(userDocRef, data, { merge: true });
}

// Função para atualizar um campo específico do documento do usuário (mais eficiente)
export async function updateUserField(userId, fieldPath, value) {
    if (!userId) return;
    const userDocRef = doc(db, 'users', userId);
    try {
        await updateDoc(userDocRef, {
            [fieldPath]: value
        });
        console.log(`Campo ${fieldPath} atualizado com sucesso.`);
    } catch (error) {
        console.error(`Erro ao atualizar o campo ${fieldPath}:`, error);
        // Se o campo não existir, pode ser necessário usar setDoc com merge
        await setDoc(userDocRef, { [fieldPath]: value }, { merge: true });
    }
}
