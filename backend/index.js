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
    
    // Analisa o texto com o Gemini Pro
    const dadosAnalisados = await analisarDocumento(textoExtraido);
    
    // Prepara a resposta com os dados analisados
    res.json({
      arquivo: filename,
      textoExtraido: textoExtraido.substring(0, 1000) + (textoExtraido.length > 1000 ? '...' : ''), // Limita o tamanho do texto
      dadosAnalisados,
      dataProcessamento: new Date().toISOString()
    });
  } catch (err) {
    console.error('Erro ao processar o PDF:', err);
    res.status(500).json({ error: 'Erro ao processar o PDF', details: err.message });
  }
});

// Endpoint para processar um PDF com um modelo de ficha específico
app.post('/processar-com-modelo', upload.fields([
  { name: 'documento', maxCount: 1 },
  { name: 'modelo', maxCount: 1 }
]), async (req, res) => {
  try {
    // Verifica se os arquivos foram enviados
    if (!req.files || !req.files.documento || !req.files.modelo) {
      return res.status(400).json({ error: 'É necessário enviar o documento e o modelo de ficha.' });
    }

    const documentoPath = req.files.documento[0].path;
    const modeloPath = req.files.modelo[0].path;

    // Extrai texto dos PDFs
    const documentoBuffer = fs.readFileSync(documentoPath);
    const modeloBuffer = fs.readFileSync(modeloPath);
    
    const documentoPdf = await pdf(documentoBuffer);
    const modeloPdf = await pdf(modeloBuffer);
    
    // Analisa o documento com base no modelo
    const dadosAnalisados = await analisarDocumento(documentoPdf.text, modeloPdf.text);
    
    res.json({
      documento: req.files.documento[0].originalname,
      modelo: req.files.modelo[0].originalname,
      dadosAnalisados,
      dataProcessamento: new Date().toISOString()
    });
  } catch (err) {
    console.error('Erro ao processar documentos:', err);
    res.status(500).json({ error: 'Erro ao processar documentos', details: err.message });
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
