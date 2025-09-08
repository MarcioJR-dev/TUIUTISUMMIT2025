import express from 'express';
import multer from 'multer';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import pdf from 'pdf-parse';
import dotenv from 'dotenv';
import { analisarDocumento } from './gemini.js';

// Carrega variáveis de ambiente
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

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
    fileSize: 10 * 1024 * 1024 // Limite de 10MB
  }
});

// Endpoint para upload de arquivo
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

// Endpoint para ficha técnica com extração de texto do PDF usando pdf-parse e análise com Gemini
app.get('/ficha/:filename', async (req, res) => {
  const { filename } = req.params;
  const filePath = path.join('uploads', filename);
  try {
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Arquivo não encontrado.' });
    }

    const dataBuffer = fs.readFileSync(filePath);
    const pdfData = await pdf(dataBuffer);
    
    // Extrai o texto do PDF
    const textoExtraido = pdfData.text;
    
    // Analisa o texto do PDF do usuário com o modelo fixo
    const dadosAnalisados = await analisarDocumento(textoExtraido, MODELO_FIXO);
    
    // Prepara a resposta com os dados analisados
    res.json({
      arquivo: filename,
      textoExtraido: textoExtraido, // Agora retorna o texto completo
      dadosAnalisados,
      dataProcessamento: new Date().toISOString()
    });
  } catch (err) {
    console.error('Erro ao processar o PDF:', err);
    res.status(500).json({ error: 'Erro ao processar o PDF', details: err.message });
  }
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
