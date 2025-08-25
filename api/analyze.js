// api/analyze.js
const { GoogleGenerativeAI } = require("@google/generative-ai");

module.exports = async (req, res) => {
    // Obtenha a chave de API das variáveis de ambiente
    const API_KEY = process.env.GEMINI_API_KEY;

    if (!API_KEY) {
        res.status(500).json({ error: "Chave de API não configurada." });
        return;
    }

    try {
        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-pro"});

        const prompt = req.body.prompt; // O prompt virá da sua requisição do front-end

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        res.status(200).send(text);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Erro na comunicação com a API da IA." });
    }
};
