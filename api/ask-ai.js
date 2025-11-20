// Arquivo: /api/ask-ai.js

const { GoogleGenerativeAI } = require('@google/generative-ai');

// A chave da API é pega das "Environment Variables" do seu projeto, que é o jeito seguro.
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Esta é a função que será executada quando o front-end chamar /api/ask-ai
module.exports = async (req, res) => {
  // Permite que seu github.html se comunique com esta API
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Necessário para a requisição POST funcionar corretamente
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Nenhum prompt fornecido.' });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const fullPrompt = `Você é um assistente especialista em Git e GitHub. Responda à seguinte pergunta de forma clara, direta e útil, usando formatação HTML simples (como <p>, <strong>, <ul>, <li>, <code>) quando apropriado: "${prompt}"`;

    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();

    return res.status(200).json({ answer: text });
    
  } catch (error) {
    console.error('Erro na função da API:', error);
    return res.status(500).json({ error: 'Falha ao gerar resposta da IA.' });
  }
};