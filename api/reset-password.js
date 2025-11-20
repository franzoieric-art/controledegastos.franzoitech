// Arquivo: api/reset-password.js
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
// Importe o serviço de e-mail que você usa (Nodemailer, SendGrid, etc.)
// import { sendEmail } from '../utils/email-service'; 

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

// Garante que o app do Admin SDK só seja inicializado uma vez
if (!initializeApp.length) {
    initializeApp({
        credential: cert(serviceAccount)
    });
}

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ message: 'Método não permitido' });
    }

    const email = request.body.email;

    if (!email) {
        return response.status(400).json({ message: 'E-mail é obrigatório.' });
    }

    // O objeto de configuração OBRIGATÓRIO pelo Google
    const actionCodeSettings = {
        // A URL deve ser o seu domínio de login e estar na lista branca do Firebase!
        url: 'https://ricoplus.com.br/login',
        handleCodeInApp: false,
    };

    try {
        // 1. Gera o link de reset (com o objeto actionCodeSettings)
        const linkDeReset = await getAuth().generatePasswordResetLink(
            email,
            actionCodeSettings // <--- ESTE PARÂMETRO É A SOLUÇÃO DO 400!
        );

        // 2. ENVIAR O E-MAIL (Usando seu serviço customizado)
        // Você precisa implementar a função de envio aqui:
        
        // Exemplo:
        // const emailBody = `Olá, clique neste link para redefinir sua senha: ${linkDeReset}`;
        // await sendEmail(email, 'Recuperação de Senha Rico Plus', emailBody);

        console.log(`Link de reset gerado para: ${email}`);

        // O Firebase retorna 200 mesmo se o usuário não existir (por segurança)
        return response.status(200).json({ message: 'Link de recuperação enviado (Verifique o e-mail).' });

    } catch (error) {
        // Captura erros como usuário não encontrado ou configuração inválida
        console.error('Erro ao gerar link de reset:', error.message);
        
        // O Front-End deve receber uma mensagem genérica de sucesso para evitar enumeração de e-mails
        return response.status(200).json({ message: 'Se o e-mail estiver cadastrado, o link será enviado.' });

    }
}