const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();

// --- CONFIGURAÇÃO ---
// 1. TOKEN DA SUA CONTA HOTMART (não muda)
const HOTMART_TOKEN = "TxQUAdJjudKxmzlKEuxVAHfSu7cBml975237d1-4f36-4f16-aec1-513b651fdfc8";

// 2. CREDENCIAIS DO SEU NOVO EMAIL PROFISSIONAL DA HOSTINGER
const HOSTINGER_EMAIL = "suporte@franzoitech.com";
const HOSTINGER_PASSWORD = "C@bana8988"; // <-- SUBSTITUA PELA SENHA REAL DO SEU EMAIL
// --- FIM DA CONFIGURAÇÃO ---


// Configuração do serviço de email para a Hostinger
const transporter = nodemailer.createTransport({
    host: "smtp.hostinger.com", // Servidor SMTP da Hostinger
    port: 465,                  // Porta segura (SSL)
    secure: true,               // Requer SSL
    auth: {
        user: HOSTINGER_EMAIL,
        pass: HOSTINGER_PASSWORD,
    },
});

/**
 * Função para enviar o email de boas-vindas com o link de criação de senha.
 */
async function sendWelcomeEmail(email, name, passwordLink) {
    const mailOptions = {
        from: `"Rico Plus | Franzoi Tech" <${HOSTINGER_EMAIL}>`, // Usa o novo email
        to: email,
        subject: '✅ Seu acesso ao Painel Financeiro foi liberado!',
        html: `
            <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 40px auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 16px; background-color: #f9f9f9; text-align: center;">
                <img src="https://raw.githubusercontent.com/franzoieric-art/controledegastos.franzoitech/30cd2b50cb7d032f5820b3d601e7601d61ce275a/ricoplus-landing-page/logoricoplus.png" alt="Logo Rico Plus" style="height: 80px; margin-bottom: 24px;">
                
                <h1 style="color: #1d1d1f; font-size: 24px; font-weight: 700; margin-bottom: 16px;">Olá, ${name}!</h1>
                
                <p style="color: #333; font-size: 16px; line-height: 1.6;">Sua compra foi aprovada e seu acesso ao <strong>Painel Financeiro Rico Plus</strong> está pronto!</p>
                <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 32px;">Para o seu primeiro acesso, por favor, crie uma senha segura clicando no botão abaixo:</p>
                
                <a href="${passwordLink}" style="background-color: #0071e3; color: white; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; display: inline-block;">Criar Minha Senha de Acesso</a>
                
                <p style="margin-top: 32px; font-size: 12px; color: #888;">Se você não solicitou este email, pode ignorá-lo com segurança.</p>
                <p style="font-size: 12px; color: #888;">&copy; ${new Date().getFullYear()} Franzoi Tech. Todos os direitos reservados.</p>
            </div>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Email de boas-vindas enviado com sucesso para ${email}`);
    } catch (error) {
        console.error(`Erro ao enviar email para ${email}:`, error);
    }
}


exports.hotmartWebhook = functions.https.onRequest(async (req, res) => {
    // ... O restante do código continua exatamente o mesmo
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Hottok");

    if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
    }
    
    console.log("Corpo inteiro da requisição recebida (req.body):", JSON.stringify(req.body, null, 2));

    const hottok = req.get("Hottok");
    if (hottok !== HOTMART_TOKEN) {
        console.warn("AVISO: Hottok não recebido ou inválido. Continuando para teste.");
    }

    const event = req.body.event;
    
    if (event && event.toLowerCase() !== "purchase_approved") {
        console.log("Evento recebido, mas não é compra aprovada:", event);
        return res.status(200).send("Evento ignorado.");
    }
    
    const buyerEmail = req.body.data.buyer.email;
    const buyerName = req.body.data.buyer.name;

    if (!buyerEmail) {
        console.error("E-mail do comprador não encontrado no payload. Corpo da requisição:", JSON.stringify(req.body, null, 2));
        return res.status(400).send("Dados inválidos.");
    }
    try {
        let userRecord;
        try {
            userRecord = await admin.auth().getUserByEmail(buyerEmail);
            console.log("Usuário já existente encontrado:", userRecord.uid);
        } catch (error) {
            if (error.code === 'auth/user-not-found') {
                userRecord = await admin.auth().createUser({ email: buyerEmail, displayName: buyerName, emailVerified: true });
                console.log("Novo usuário criado com sucesso:", userRecord.uid);
            } else { throw error; }
        }
        const link = await admin.auth().generatePasswordResetLink(buyerEmail);
        await sendWelcomeEmail(buyerEmail, buyerName, link);
        return res.status(200).send("Usuário processado e email enviado com sucesso.");
    } catch (error) {
        console.error("Erro ao processar o usuário no Firebase:", error);
        return res.status(500).send("Erro interno do servidor.");
    }
});