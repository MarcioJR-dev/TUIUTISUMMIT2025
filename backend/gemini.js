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
    // Prompt para retornar JSON estruturado em seções
    let prompt = `Extraia do texto abaixo as informações para preencher a ficha técnica. Retorne um JSON com as seguintes seções e campos. Se algum campo não estiver presente, use "FALTANDO INFORMAÇÃO".

Estrutura desejada:
{
  "informacoesGerais": {
    "pais": "valor",
    "tipoProjeto": "valor",
    "contratante": "valor",
    "potenciaInstalada": "valor",
    "valorContrato": "valor",
    "inicioOperacao": "valor",
    "periodoExecucao": "valor",
    "duracao": "valor",
    "objeto": "valor"
  },
  "localizacao": {
    "latitude": "valor",
    "longitude": "valor",
    "rio": "valor",
    "bacia": "valor"
  },
  "desvio": {
    "tipo": "valor",
    "vazaoDesvio": "valor"
  },
  "reservatorio": {
    "naMaximoNormalMontante": "valor",
    "areaNivelMaximoNormal": "valor",
    "volumeNivelMaximoNormal": "valor"
  },
  "barragemPrincipal": {
    "tipo": "valor",
    "alturaMaxima": "valor",
    "comprimento": "valor",
    "volume": "valor"
  },
  "barragensComplementares": {
    "tipo": "valor",
    "comprimentoTotal": "valor",
    "alturaMaxima": "valor",
    "volumeTotal": "valor"
  },
  "vertedouro": {
    "tipo": "valor",
    "numeroVaos": "valor",
    "comprimentoTotal": "valor",
    "capacidade": "valor",
    "tr": "valor"
  },
  "casaForcaPrincipal": {
    "tipo": "valor",
    "numeroUnidadesGeradoras": "valor",
    "tipoTurbina": "valor",
    "potenciaUnitaria": "valor",
    "rendimento": "valor",
    "quedaBruta": "valor",
    "vazaoMaximaTurbinada": "valor"
  },
  "materiaisUtilizados": "valor",
  "responsaveisTecnicos": "valor",
  "observacoesRelevantes": "valor"
}

TEXTO EXTRAÍDO:
${pdfText}
`;

    // Chama o modelo Gemini
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