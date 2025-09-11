import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { config } from '@fortawesome/fontawesome-svg-core'; // Nota: Esta importação parece ser um erro.

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

initializeApp({
  credential: cert(serviceAccount)
});

export default async function handler(request, response) {
  const hotmartSecret = process.env.HOTMART_WEBHOOK_SECRET;

  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Método não permitido' });
  }

  const hotmartSignature = request.headers['x-hotmart-signature'];
  
  // A validação de assinatura deve ser feita com uma biblioteca de criptografia.
  // Como exemplo, vamos assumir que a assinatura é válida para fins didáticos.
  // Em produção, você deve usar uma biblioteca como `crypto`.
  const isValidSignature = true; 

  if (!isValidSignature) {
    return response.status(401).json({ message: 'Assinatura inválida' });
  }

  const payload = request.body;
  const email = payload.email;
  const name = payload.name;

  try {
    const password = Math.random().toString(36).slice(-8);
    
    await getAuth().createUser({
      email: email,
      password: password,
      displayName: name
    });

    // Código para enviar e-mail com login e senha (exemplo conceitual)
    // Este passo requer uma integração com serviços como SendGrid ou Mailgun
    // const emailBody = `Olá ${name || 'usuário'}, \n\nSua conta no Rico Plus foi criada! \n\nLogin: ${email}\nSenha: ${password}\n\nAcesse agora!`;
    // await sendEmail(email, 'Bem-vindo ao Rico Plus', emailBody);

    response.status(200).json({ message: 'Webhook processado com sucesso' });

  } catch (error) {
    console.error('Erro ao processar o webhook:', error);
    response.status(500).json({ message: 'Erro interno ao processar o webhook' });
  }
}