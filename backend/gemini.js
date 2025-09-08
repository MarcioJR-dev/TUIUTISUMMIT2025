import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Inicializa a API do Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * Analisa o conteúdo de um PDF usando o modelo Gemini
 * @param {string} pdfText - Texto extraído do PDF
 * @param {string} modeloFicha - Modelo de ficha técnica (opcional)
 * @returns {Object} - Objeto com as informações extraídas e formatadas
 */
export async function analisarDocumento(pdfText, modeloFicha = null) {
  try {
    // Constrói o prompt
    let prompt = `Analise o seguinte texto extraído de um documento técnico de engenharia/arquitetura e extraia as informações mais relevantes para uma ficha técnica:\n\n${pdfText}\n\nExtraia e organize as seguintes informações em formato JSON:\n- Nome do projeto\n- Cliente\n- Localização\n- Tipo de obra\n- Responsáveis técnicos\n- Datas importantes\n- Especificações técnicas principais\n- Dimensões e capacidades\n- Materiais utilizados\n- Observações relevantes`;
    if (modeloFicha) {
      prompt += `\n\nSiga o formato deste modelo de ficha técnica: ${modeloFicha}`;
    }

    // Chama o modelo Gemini (use "gemini-2.0-flash" ou outro disponível)
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
    });

    const text = response.text;

    // Tenta extrair o JSON da resposta
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return {
        textoCompleto: text,
        dadosExtraidos: false,
      };
    } catch (jsonError) {
      console.error("Erro ao processar JSON da resposta:", jsonError);
      return {
        textoCompleto: text,
        dadosExtraidos: false,
        erro: "Formato de resposta inválido",
      };
    }
  } catch (error) {
    console.error("Erro ao analisar documento com Gemini:", error);
    throw new Error(`Falha na análise com IA: ${error.message}`);
  }
}