// Importa as ferramentas necessárias do Firebase
const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Inicializa a conexão segura com seu projeto Firebase
admin.initializeApp();

// Esta é a nossa "caixa de correio inteligente"
exports.hotmartWebhook = functions.https.onRequest(async (req, res) => {
  // 1. VERIFICAR A SEGURANÇA (MUITO IMPORTANTE!)
  const hottokCorreto =
  "TxQUAdJjudKxmzlKEuxVAHfSu7cBml975237d1-4f36-4f16-aec1-513b651fdfc8";

  const hottokRecebido = req.headers["x-hotmart-hottok"];
  if (hottokRecebido !== hottokCorreto) {
    console.error("Hottok inválido recebido:", hottokRecebido);
    return res.status(401).send("Acesso não autorizado.");
  }

  // 2. PEGAR OS DADOS DO COMPRADOR
  const data = req.body;

  if (data.status !== "approved") {
    console.log(`Status recebido: ${data.status}. Ignorando.`);
    return res.status(200).send(`Status ${data.status} recebido.`);
  }

  const emailComprador = data.buyer.email;
  const nomeComprador = data.buyer.name;
  const idTransacao = data.transaction;

  // 3. GERAR UMA SENHA ALEATÓRIA E SEGURA
  const senhaTemporaria = Math.random().toString(36).slice(-8);

  try {
    // 4. CRIAR O USUÁRIO NO FIREBASE AUTHENTICATION
    const userRecord = await admin.auth().createUser({
      email: emailComprador,
      password: senhaTemporaria,
      displayName: nomeComprador,
    });

    // 5. SALVAR DADOS ADICIONAIS NO FIRESTORE
    await admin.firestore().collection("usuarios").doc(userRecord.uid).set({
      nome: nomeComprador,
      email: emailComprador,
      hotmartTransactionId: idTransacao,
      dataCadastro: new Date(),
      plano: "Rico Plus Anual",
    });

    // 6. ENVIAR O E-MAIL DE BOAS-VINDAS COM A SENHA
    console.log(
        `Usuário ${emailComprador} criado. Senha: ${senhaTemporaria}.`,
    );

    // 7. RESPONDER PARA A HOTMART QUE DEU TUDO CERTO
    console.log("Webhook processado para transação:", idTransacao);
    return res.status(200).send("Webhook processado com sucesso!");
  } catch (error) {
    if (error.code === "auth/email-already-exists") {
      console.warn(`Usuário já existe: ${emailComprador}`);
      return res.status(200).send("Usuário já existente.");
    }
    console.error("Erro ao criar usuário:", error);
    return res.status(500).send("Erro interno ao processar.");
  }
});
