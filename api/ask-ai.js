// Arquivo: /api/ask-ai.js
import { GoogleGenerativeAI } from "@google/generative-ai";

export default async (req, res) => {
  // Cabeçalhos de CORS (Liberado geral com '*')
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Responde ao "pre-flight" do navegador
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const API_KEY = process.env.GEMINI_API_KEY;

  if (!API_KEY) {
    console.error("ERRO: GEMINI_API_KEY não encontrada em ask-ai.js");
    return res.status(500).json({ error: 'Chave de API não configurada.' });
  }

  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Nenhum prompt fornecido.' });
    }

    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // 💡 AQUI ESTÁ A MÁGICA: O contexto foi atualizado para o seu app financeiro
    const fullPrompt = `
      Você é o assistente virtual inteligente do "Rico Plus", um painel de controle financeiro pessoal.
      Seu objetivo é ajudar o usuário com dúvidas sobre finanças, gastos, economia e funcionalidades do sistema.
      
      Responda à seguinte pergunta de forma clara, direta, curta e encorajadora.
      Use formatação HTML simples (como <p>, <strong>, <ul>, <li>) se precisar organizar a resposta.
      
      Pergunta do usuário: "${prompt}"
    `;

    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();

    return res.status(200).json({ answer: text });
    
  } catch (error) {
    console.error('Erro na função ask-ai:', error);
    return res.status(500).json({ error: 'Falha ao gerar resposta da IA.' });
  }
};