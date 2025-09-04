import express from 'express';
import multer from 'multer';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import pdf from 'pdf-parse';

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

const upload = multer({ dest: 'uploads/' });

// Endpoint para upload de arquivo
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
  }
  // Salva o arquivo e retorna o nome gerado
  res.json({ filename: req.file.filename, originalname: req.file.originalname });
});

// Endpoint para ficha técnica com extração de texto do PDF usando pdf-parse
app.get('/ficha/:filename', async (req, res) => {
  const { filename } = req.params;
  const filePath = path.join('uploads', filename);
  try {
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Arquivo não encontrado.' });
    }

    const dataBuffer = fs.readFileSync(filePath);
    const pdfData = await pdf(dataBuffer);

    res.json({
      projeto: 'Projeto Exemplo',
      arquivo: filename,
      descricao: 'Ficha técnica gerada automaticamente (com texto extraído real).',
      textoExtraido: pdfData.text,
      dados: {
        cliente: 'Intertechne',
        responsavel: 'Pietro Gradowski Cechelero',
        telefone: '(41) 3219-7200',
        email: 'pgc@inttpartner.com.br',
        data: new Date().toLocaleDateString()
      }
    });
  } catch (err) {
    console.error('Erro ao processar o PDF:', err);
    res.status(500).json({ error: 'Erro ao processar o PDF', details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Backend rodando em http://localhost:${PORT}`);
});
