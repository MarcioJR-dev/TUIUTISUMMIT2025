import express from 'express';
import multer from 'multer';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { analisarDocumento, analisarTextoConsolidado } from './gemini.js';

// Carrega variáveis de ambiente
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Armazenamento de processamentos em memória
const processamentos = new Map();

// Cria diretório de uploads se não existir
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

app.use(cors());
app.use(express.json());

// Configuração do multer para armazenar arquivos com extensão original
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Aceita apenas arquivos PDF
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos PDF são permitidos'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // Limite de 10MB por arquivo
    files: 10 // Máximo 10 arquivos por upload
  }
});

// Endpoint para upload de arquivo único
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
  }
  // Salva o arquivo e retorna o nome gerado
  res.json({ 
    filename: req.file.filename, 
    originalname: req.file.originalname,
    path: req.file.path
  });
});

// Endpoint para upload de múltiplos arquivos
app.post('/upload-multiple', upload.array('files', 10), (req, res) => {
  console.log('Upload múltiplo recebido:', req.files?.length || 0, 'arquivos');
  
  if (!req.files || req.files.length === 0) {
    console.log('Erro: Nenhum arquivo enviado');
    return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
  }

  // Gera ID único para o processamento
  const processamentoId = uuidv4();
  console.log('ID do processamento gerado:', processamentoId);
  
  // Inicializa o processamento
  const processamento = {
    id: processamentoId,
    status: 'iniciando',
    totalArquivos: req.files.length,
    processados: 0,
    pendentes: req.files.length,
    erros: 0,
    resultados: [],
    dadosConsolidados: null,
    dataInicio: new Date().toISOString(),
    dataFim: null,
    arquivos: req.files.map(file => ({
      filename: file.filename,
      originalname: file.originalname,
      path: file.path,
      status: 'pendente'
    }))
  };

  // Armazena o processamento
  processamentos.set(processamentoId, processamento);
  console.log('Processamento armazenado:', processamentoId);

  // Inicia o processamento em background
  console.log('Iniciando processamento em background...');
  processarPDFsSequencial(processamentoId);

  // Retorna o ID do processamento
  console.log('Retornando resposta para o cliente');
  res.json({
    processamentoId: processamentoId,
    totalArquivos: req.files.length,
    status: 'iniciando',
    message: 'Processamento iniciado. Use o ID para acompanhar o progresso.'
  });
});

// Função para processar PDFs sequencialmente
async function processarPDFsSequencial(processamentoId) {
  console.log(`Iniciando processamento: ${processamentoId}`);
  const processamento = processamentos.get(processamentoId);
  if (!processamento) {
    console.log(`Processamento não encontrado: ${processamentoId}`);
    return;
  }

  try {
    processamento.status = 'processando';
    console.log(`Status alterado para processando: ${processamentoId}`);
    
    for (let i = 0; i < processamento.arquivos.length; i++) {
      const arquivo = processamento.arquivos[i];
      console.log(`Processando arquivo ${i + 1}/${processamento.arquivos.length}: ${arquivo.filename}`);
      
      try {
        // Atualiza status do arquivo
        arquivo.status = 'processando';
        
        // Lê o arquivo PDF
        console.log(`Lendo arquivo: ${arquivo.path}`);
        const dataBuffer = fs.readFileSync(arquivo.path);
        console.log(`Arquivo lido, tamanho: ${dataBuffer.length} bytes`);
        
        // Analisa com Gemini
        console.log(`Enviando para Gemini: ${arquivo.filename}`);
        const dadosAnalisados = await analisarDocumento(dataBuffer, MODELO_FIXO);
        console.log(`Resposta do Gemini recebida para: ${arquivo.filename}`);
        
        // Adiciona resultado
        processamento.resultados.push({
          arquivo: arquivo.filename,
          originalname: arquivo.originalname,
          status: 'sucesso',
          dadosAnalisados: dadosAnalisados,
          dataProcessamento: new Date().toISOString()
        });
        
        arquivo.status = 'concluido';
        processamento.processados++;
        processamento.pendentes--;
        
      } catch (erro) {
        console.error(`Erro ao processar ${arquivo.filename}:`, erro);
        
        processamento.resultados.push({
          arquivo: arquivo.filename,
          originalname: arquivo.originalname,
          status: 'erro',
          erro: erro.message,
          dataProcessamento: new Date().toISOString()
        });
        
        arquivo.status = 'erro';
        processamento.erros++;
        processamento.pendentes--;
      }
    }
    
    // Consolida dados de todos os PDFs processados com sucesso
    console.log(`Consolidando dados para: ${processamentoId}`);
    if (processamento.resultados.filter(r => r.status === 'sucesso').length > 0) {
      processamento.dadosConsolidados = await consolidarDados(processamento.resultados);
    }
    
    processamento.status = 'concluido';
    processamento.dataFim = new Date().toISOString();
    console.log(`Processamento concluído: ${processamentoId}`);
    
  } catch (erro) {
    console.error('Erro no processamento:', erro);
    processamento.status = 'erro';
    processamento.erro = erro.message;
    processamento.dataFim = new Date().toISOString();
    console.log(`Processamento com erro: ${processamentoId} - ${erro.message}`);
  }
}

// Função para consolidar dados de múltiplos PDFs
async function consolidarDados(resultados) {
  const sucessos = resultados.filter(r => r.status === 'sucesso');
  
  if (sucessos.length === 0) return null;
  
  console.log('Consolidando dados de', sucessos.length, 'PDFs processados com sucesso');
  
  // Criar um texto consolidado com todos os dados extraídos
  let textoConsolidado = `DADOS CONSOLIDADOS DE ${sucessos.length} PROJETOS:\n\n`;
  
  sucessos.forEach((resultado, index) => {
    textoConsolidado += `=== PROJETO ${index + 1}: ${resultado.originalname} ===\n`;
    textoConsolidado += `Arquivo: ${resultado.arquivo}\n\n`;
    
    // Adicionar dados estruturados do projeto
    if (resultado.dadosAnalisados) {
      const dados = resultado.dadosAnalisados;
      
      if (dados.informacoesGerais) {
        textoConsolidado += `INFORMAÇÕES GERAIS:\n`;
        Object.entries(dados.informacoesGerais).forEach(([key, value]) => {
          textoConsolidado += `${key}: ${value}\n`;
        });
        textoConsolidado += `\n`;
      }
      
      if (dados.localizacao) {
        textoConsolidado += `LOCALIZAÇÃO:\n`;
        Object.entries(dados.localizacao).forEach(([key, value]) => {
          textoConsolidado += `${key}: ${value}\n`;
        });
        textoConsolidado += `\n`;
      }
      
      if (dados.barragemPrincipal) {
        textoConsolidado += `BARRAGEM PRINCIPAL:\n`;
        Object.entries(dados.barragemPrincipal).forEach(([key, value]) => {
          textoConsolidado += `${key}: ${value}\n`;
        });
        textoConsolidado += `\n`;
      }
      
      if (dados.casaForcaPrincipal) {
        textoConsolidado += `CASA DE FORÇA PRINCIPAL:\n`;
        Object.entries(dados.casaForcaPrincipal).forEach(([key, value]) => {
          textoConsolidado += `${key}: ${value}\n`;
        });
        textoConsolidado += `\n`;
      }
    }
    
    textoConsolidado += `\n---\n\n`;
  });
  
  console.log('Texto consolidado criado, enviando para Gemini...');
  
  // Enviar dados consolidados para o Gemini criar uma ficha técnica unificada
  try {
    const fichaConsolidada = await analisarTextoConsolidado(textoConsolidado, MODELO_FIXO);
    console.log('Ficha consolidada criada pelo Gemini');
    
    return {
      totalProjetos: sucessos.length,
      projetos: sucessos.map(r => ({
        arquivo: r.arquivo,
        originalname: r.originalname,
        dados: r.dadosAnalisados
      })),
      fichaConsolidada: fichaConsolidada,
      textoConsolidado: textoConsolidado
    };
  } catch (erro) {
    console.error('Erro ao criar ficha consolidada:', erro);
    return {
      totalProjetos: sucessos.length,
      projetos: sucessos.map(r => ({
        arquivo: r.arquivo,
        originalname: r.originalname,
        dados: r.dadosAnalisados
      })),
      erro: erro.message
    };
  }
}

// Remover a leitura do PDF do modelo fixo
// Definir o modelo fixo como string
const MODELO_FIXO = `PAÍS: [preencher]
TIPO DE PROJETO: [preencher]
CONTRATANTE: [preencher]
POTÊNCIA INSTALADA: [preencher] MW
VALOR DO CONTRATO - DATA BASE: [preencher] - [preencher data]
INÍCIO DE OPERAÇÃO: [preencher data]
PERÍODO DE EXECUÇÃO DO PROJETO: [preencher data] – [preencher data]
DURAÇÃO: [preencher] meses
OBJETO: [preencher]

PRINCIPAIS CARACTERISTICAS TÉCNICAS:

LOCALIZAÇÃO
LATITUDE: [preencher]
LONGITUDE: [preencher]
RIO: [preencher]
BACIA: [preencher]
DESVIO
TIPO / VAZÃO DE DESVIO: [preencher] / [preencher] m³/s
RESERVATÓRIO
N.A MÁXIMO NORMAL DE MONTANTE: [preencher] m
ÁREA NO NÍVEL MÁXIMO NORMAL: [preencher] km²
VOLUME NO NÍVEL MÁXIMO NORMAL: [preencher] hm³
BARRAGEM PRINCIPAL
TIPO: [preencher]
ALTURA MÁXIMA: [preencher] m
COMPRIMENTO: [preencher] m
VOLUME: [preencher] m³

BARRAGENS COMPLEMENTARES
TIPO: [preencher]
COMPRIMENTO TOTAL: [preencher] m
ALTURA MÁXIMA: [preencher] m
VOLUME TOTAL: [preencher] m³
VERTEDOURO
TIPO / NÚMERO DE VÃOS: [preencher] / [preencher]
COMPRIMENTO TOTAL / CAPACIDADE/ TR: [preencher] m / [preencher] m³/s / [preencher] anos
CASA DE FORÇA PRINCIPAL
TIPO / NÚMERO DE UNIDADES GERADORAS: [preencher] / [preencher]
TIPO DE TURBINA / POTÊNCIA UNITÁRIA / RENDIMENTO: [preencher] / [preencher] MW/ [preencher] %
QUEDA BRUTA / VAZÃO MÁXIMA TURBINADA: [preencher] m / [preencher] m³/s
CARACTERÍSTICAS ESPECÍFICAS: [preencher]`;

// Endpoint para ficha técnica com análise multimodal do PDF usando Gemini
app.get('/ficha/:filename', async (req, res) => {
  const { filename } = req.params;
  const filePath = path.join('uploads', filename);
  try {
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Arquivo não encontrado.' });
    }

    const dataBuffer = fs.readFileSync(filePath);
    
    // Analisa o PDF diretamente com Gemini (multimodal - texto + imagens)
    const dadosAnalisados = await analisarDocumento(dataBuffer, MODELO_FIXO);
    
    // Prepara a resposta com os dados analisados
    res.json({
      arquivo: filename,
      dadosAnalisados,
      dataProcessamento: new Date().toISOString(),
      metodo: 'multimodal' // Indica que usou análise multimodal
    });
  } catch (err) {
    console.error('Erro ao processar o PDF:', err);
    res.status(500).json({ error: 'Erro ao processar o PDF', details: err.message });
  }
});

// Endpoint para acompanhar status do processamento
app.get('/processamento/:id/status', (req, res) => {
  const { id } = req.params;
  const processamento = processamentos.get(id);
  
  if (!processamento) {
    return res.status(404).json({ error: 'Processamento não encontrado.' });
  }
  
  res.json({
    id: processamento.id,
    status: processamento.status,
    totalArquivos: processamento.totalArquivos,
    processados: processamento.processados,
    pendentes: processamento.pendentes,
    erros: processamento.erros,
    dataInicio: processamento.dataInicio,
    dataFim: processamento.dataFim,
    progresso: Math.round((processamento.processados / processamento.totalArquivos) * 100)
  });
});

// Endpoint para obter resultado completo do processamento
app.get('/processamento/:id/resultado', (req, res) => {
  const { id } = req.params;
  const processamento = processamentos.get(id);
  
  if (!processamento) {
    return res.status(404).json({ error: 'Processamento não encontrado.' });
  }
  
  res.json({
    id: processamento.id,
    status: processamento.status,
    totalArquivos: processamento.totalArquivos,
    processados: processamento.processados,
    pendentes: processamento.pendentes,
    erros: processamento.erros,
    resultados: processamento.resultados,
    dadosConsolidados: processamento.dadosConsolidados,
    dataInicio: processamento.dataInicio,
    dataFim: processamento.dataFim,
    progresso: Math.round((processamento.processados / processamento.totalArquivos) * 100)
  });
});

// Endpoint para listar todos os arquivos processados
app.get('/arquivos', (req, res) => {
  try {
    const arquivos = fs.readdirSync('uploads')
      .filter(file => file.endsWith('.pdf'))
      .map(file => {
        const stats = fs.statSync(path.join('uploads', file));
        return {
          nome: file,
          tamanho: stats.size,
          dataUpload: stats.mtime
        };
      });
    
    res.json(arquivos);
  } catch (err) {
    console.error('Erro ao listar arquivos:', err);
    res.status(500).json({ error: 'Erro ao listar arquivos', details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Backend rodando em http://localhost:${PORT}`);
});
