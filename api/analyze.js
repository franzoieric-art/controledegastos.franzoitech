// api/analyze.js
const { GoogleGenerativeAI } = require("@google/generative-ai");

module.exports = async (req, res) => {
    // 1. Obtenha a chave de API das variáveis de ambiente da Vercel
    const API_KEY = process.env.GEMINI_API_KEY;

    // Se a chave não estiver configurada na Vercel, retorne um erro claro.
    if (!API_KEY) {
        // Este erro aparecerá nos logs da Vercel se a variável de ambiente não for encontrada.
        console.error("GEMINI_API_KEY não foi encontrada nas variáveis de ambiente.");
        return res.status(500).json({ error: "Chave de API não configurada no servidor." });
    }

    // 2. Use um bloco try...catch para capturar qualquer erro durante a chamada da IA
    try {
        const genAI = new GoogleGenerativeAI(API_KEY);
        
        // ALTERAÇÃO IMPORTANTE: Usando o nome de modelo correto e estável
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

        // Obtenha o prompt que o seu site (frontend) enviou
        const prompt = req.body.prompt;

        // Se o prompt estiver vazio, não gaste uma chamada de API
        if (!prompt) {
            return res.status(400).json({ error: "O prompt não pode estar vazio." });
        }

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // 3. Se tudo deu certo, envie a resposta de volta para o site
        return res.status(200).send(text);

    } catch (error) {
        // 4. Se qualquer coisa dentro do 'try' der errado, capture o erro aqui
        console.error("Erro ao chamar a API da Google Generative AI:", error);
        return res.status(500).json({ error: "Erro na comunicação com a API da IA." });
    }
};
