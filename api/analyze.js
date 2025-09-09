// api/analyze.js
const { GoogleGenerativeAI } = require("@google/generative-ai");

module.exports = async (req, res) => {
    // Cabeçalhos de CORS para permitir a comunicação com o front-end
    res.setHeader('Access-Control-Allow-Origin', 'https://www.franzoitech.com');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const API_KEY = process.env.GEMINI_API_KEY;

    if (!API_KEY) {
        console.error("ERRO: GEMINI_API_KEY não foi encontrada.");
        return res.status(500).json({ error: "Chave de API não configurada no servidor." });
    }

    try {
        const genAI = new GoogleGenerativeAI(API_KEY);
        
        // Mantendo o modelo original conforme solicitado.
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const { prompt } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: "O prompt não pode estar vazio." });
        }

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Enviando a resposta no formato JSON que o front-end espera.
        return res.status(200).json({ analysis: text });

    } catch (error) {
        console.error("Erro capturado ao chamar a API da IA:", error);
        return res.status(500).json({ error: "Erro na comunicação com a API da IA." });
    }
};
