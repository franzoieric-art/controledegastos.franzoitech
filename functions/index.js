const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();

// --- CONFIGURAÇÃO ---
// Suas chaves e senhas foram mantidas
const HOTMART_TOKEN = "TxQUAdJjudKxmzlKEuxVAHfSu7cBml975237d1-4f36-4f16-aec1-513b651fdfc8";
const HOSTINGER_EMAIL = "suporte@franzoitech.com";
const HOSTINGER_PASSWORD = "C@bana8988";
// --- FIM DA CONFIGURAÇÃO ---


// Configuração do serviço de email para a Hostinger (mantida)
const transporter = nodemailer.createTransport({
    host: "smtp.hostinger.com",
    port: 465,
    secure: true,
    auth: {
        user: HOSTINGER_EMAIL,
        pass: HOSTINGER_PASSWORD,
    },
});

/**
 * Função para enviar o email de boas-vindas (mantida).
 */
async function sendWelcomeEmail(email, name, passwordLink) {
    const mailOptions = {
        from: `"Rico Plus | Franzoi Tech" <${HOSTINGER_EMAIL}>`,
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


// --- LÓGICA PRINCIPAL DO WEBHOOK ATUALIZADA ---
exports.hotmartWebhook = functions.https.onRequest(async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Hottok");

    if (req.method === "OPTIONS") {
        return res.status(204).send("");
    }

    const hottok = req.get("Hottok");
    if (hottok !== HOTMART_TOKEN) {
        console.warn("AVISO: Hottok não recebido ou inválido.");
        // Em produção, a verificação do Hottok deve ser reativada para segurança
        // return res.status(401).send("Acesso não autorizado.");
    }

    const event = req.body.event ? req.body.event.toLowerCase() : null;
    const buyerEmail = req.body.data.buyer.email;

    if (!event || !buyerEmail) {
        console.error("Payload inválido: evento ou email do comprador ausente.");
        return res.status(400).send("Payload inválido.");
    }
    
    console.log(`Evento recebido: ${event} para o usuário: ${buyerEmail}`);

    try {
        const userRecord = await admin.auth().getUserByEmail(buyerEmail).catch(() => null);

        // Lógica adaptada para lidar com os diferentes eventos
        switch (event) {
            case 'purchase_approved':
                const buyerName = req.body.data.buyer.name;
                if (userRecord) {
                    if (userRecord.disabled) {
                        await admin.auth().updateUser(userRecord.uid, { disabled: false });
                        console.log(`Usuário ${buyerEmail} reativado com sucesso.`);
                    } else {
                        console.log(`Usuário ${buyerEmail} já existe e está ativo. Nenhuma ação necessária.`);
                    }
                } else {
                    const newUser = await admin.auth().createUser({ email: buyerEmail, displayName: buyerName, emailVerified: true });
                    console.log(`Novo usuário ${buyerEmail} criado com sucesso:`, newUser.uid);
                    const link = await admin.auth().generatePasswordResetLink(buyerEmail);
                    await sendWelcomeEmail(buyerEmail, buyerName, link);
                }
                break;

            case 'subscription_cancellation':
            case 'chargeback':
            case 'refund':
                if (userRecord && !userRecord.disabled) {
                    await admin.auth().updateUser(userRecord.uid, { disabled: true });
                    console.log(`Usuário ${buyerEmail} teve o acesso congelado devido ao evento: ${event}.`);
                } else {
                    console.log(`Usuário ${buyerEmail} não encontrado ou já desativado. Nenhuma ação necessária.`);
                }
                break;
            
            default:
                console.log(`Evento '${event}' recebido, mas não há ação configurada para ele. Ignorando.`);
                break;
        }

        return res.status(200).send("Webhook processado com sucesso.");

    } catch (error) {
        console.error(`Erro ao processar o evento ${event} para o usuário ${buyerEmail}:`, error);
        return res.status(500).send("Erro interno do servidor.");
    }
});