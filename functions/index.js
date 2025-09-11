const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();

const HOTMART_TOKEN = "TxQUAdJjudKxmzlKEuxVAHfSu7cBml975237d1-4f36-4f16-aec1-513b651fdfc8";
const GMAIL_EMAIL = "cabanafranzoi@gmail.com";
const GMAIL_APP_PASSWORD = "hbddowcmsfswesfm";

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: GMAIL_EMAIL,
        pass: GMAIL_APP_PASSWORD,
    },
});

async function sendWelcomeEmail(email, name, passwordLink) {
    const mailOptions = {
        from: `"Painel Financeiro" <${GMAIL_EMAIL}>`,
        to: email,
        subject: 'Bem-vindo(a)! Crie sua senha de acesso.',
        html: `<h1>Olá, ${name}!</h1><p>Sua compra foi aprovada com sucesso. Seja bem-vindo(a)!</p><p>Para acessar o painel financeiro, por favor, crie sua senha clicando no link abaixo:</p><a href="${passwordLink}" style="background-color: #0071e3; color: white; padding: 15px 25px; text-decoration: none; border-radius: 8px; display: inline-block;">Criar Minha Senha</a><p>Se você não conseguir clicar no botão, copie e cole o seguinte link no seu navegador:</p><p>${passwordLink}</p><br><p>Atenciosamente,</p><p>Equipe Franzoi Tech.</p>`,
    };
    try {
        await transporter.sendMail(mailOptions);
        console.log(`Email de boas-vindas enviado com sucesso para ${email}`);
    } catch (error) {
        console.error(`Erro ao enviar email para ${email}:`, error);
    }
}

exports.hotmartWebhook = functions.https.onRequest(async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Hottok");

    if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
    }
    
    // --- LINHA DE DEPURAÇÃO ADICIONADA ---
    console.log("Corpo inteiro da requisição recebida (req.body):", JSON.stringify(req.body, null, 2));
    // ------------------------------------

    const hottok = req.get("Hottok");
    if (hottok !== HOTMART_TOKEN) {
        console.warn("AVISO: Hottok não recebido ou inválido. Continuando para teste.");
    }

    const event = req.body.event;
    
    if (event && event.toLowerCase() !== "purchase.approved") {
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

