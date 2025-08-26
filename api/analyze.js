// api/analyze.js
const { GoogleGenerativeAI } = require("@google/generative-ai");

console.log("MÓDULO analyze.js CARREGADO"); // Ponto de controle

module.exports = async (req, res) => {
    console.log("--- FUNÇÃO INICIADA ---"); // Ponto de controle

    const API_KEY = process.env.GEMINI_API_KEY;
    console.log("Chave da API foi lida? ", API_KEY ? "Sim" : "Não, está vazia!"); // Ponto de controle

    if (!API_KEY) {
        console.error("ERRO: GEMINI_API_KEY não foi encontrada.");
        return res.status(500).json({ error: "Chave de API não configurada no servidor." });
    }

    console.log("ENTRANDO NO BLOCO TRY..."); // Ponto de controle
    try {
        console.log("1. Inicializando GoogleGenerativeAI..."); // Ponto de controle
        const genAI = new GoogleGenerativeAI(API_KEY);

        console.log("2. Obtendo o modelo gemini-1.5-flash-latest..."); // Ponto de controle
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
        console.log("Modelo obtido com sucesso."); // Ponto de controle

        const prompt = req.body.prompt;
        console.log("3. Prompt recebido:", prompt ? `"${prompt.substring(0, 50)}..."` : "Nenhum prompt recebido"); // Ponto de controle

        if (!prompt) {
            return res.status(400).json({ error: "O prompt não pode estar vazio." });
        }

        console.log("4. Gerando conteúdo com a IA..."); // Ponto de controle
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        console.log("Conteúdo gerado com sucesso."); // Ponto de controle

        return res.status(200).send(text);

    } catch (error) {
        console.error("--- ERRO CAPTURADO NO BLOCO CATCH ---"); // Ponto de controle
        console.error(error); // ESTA É A MENSAGEM DE ERRO DETALHADA QUE PRECISAMOS VER
        return res.status(500).json({ error: "Erro na comunicação com a API da IA." });
    }
};
