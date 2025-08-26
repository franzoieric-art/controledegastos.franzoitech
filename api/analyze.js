// api/analyze.js
const { GoogleGenerativeAI } = require("@google/generative-ai");

module.exports = async (req, res) => {
    // 1. Obter a chave de API das variáveis de ambiente da Vercel
    const API_KEY = process.env.GEMINI_API_KEY;

    if (!API_KEY) {
        console.error("ERRO: GEMINI_API_KEY não foi encontrada nas variáveis de ambiente.");
        return res.status(500).json({ error: "Chave de API não configurada no servidor." });
    }

    // 2. Usar o bloco try...catch para um tratamento de erros robusto
    try {
        const genAI = new GoogleGenerativeAI(API_KEY);
        
        // Usando o modelo compatível com a chave "Free" do AI Studio
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        const prompt = req.body.prompt;

        if (!prompt) {
            return res.status(400).json({ error: "O prompt não pode estar vazio." });
        }

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // 3. Enviar a resposta de volta com sucesso
        return res.status(200).send(text);

    } catch (error) {
        // 4. Se algo der errado, registrar o erro detalhado nos logs da Vercel
        console.error("Erro capturado ao chamar a API da IA:", error);
        return res.status(500).json({ error: "Erro na comunicação com a API da IA." });
    }
};
