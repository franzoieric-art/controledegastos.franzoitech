// Arquivo: api/analyze.js
import { GoogleGenerativeAI } from "@google/generative-ai";

export default async (req, res) => {
    // CORREÇÃO 1: Liberando acesso para qualquer origem (resolve o problema do domínio novo)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Responde rapidamente à verificação do navegador (Pre-flight)
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const API_KEY = process.env.GEMINI_API_KEY;

    if (!API_KEY) {
        console.error("ERRO: GEMINI_API_KEY não foi encontrada no servidor.");
        return res.status(500).json({ error: "Chave de API não configurada." });
    }

    try {
        const genAI = new GoogleGenerativeAI(API_KEY);
        
        // CORREÇÃO 2: Usando a versão estável 'gemini-1.5-flash' para garantir que funcione
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const { prompt } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: "O prompt não pode estar vazio." });
        }

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        return res.status(200).json({ analysis: text });

    } catch (error) {
        console.error("Erro detalhado da IA:", error);
        return res.status(500).json({ error: "Erro ao processar a inteligência artificial." });
    }
};