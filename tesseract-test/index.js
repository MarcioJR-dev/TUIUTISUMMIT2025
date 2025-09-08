import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { extractTextFromPDF } from './ocr.js';

const app = express();

// Configure multer to preserve file extensions
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + extension);
  }
});

const upload = multer({ storage: storage });

app.post('/ocr', upload.single('image'), async (req, res) => {
  try {
    console.log('Processing file:', req.file.originalname);

    // Extract text from PDF
    const text = await extractTextFromPDF(req.file.path, 'por');

    // Create text file name based on original PDF name
    const originalName = path.parse(req.file.originalname).name;
    const textFileName = `${originalName}_extracted_text.txt`;
    const textFilePath = path.join('extracted_texts', textFileName);

    // Create directory if it doesn't exist
    if (!fs.existsSync('extracted_texts')) {
      fs.mkdirSync('extracted_texts');
    }

    // Save text to file
    fs.writeFileSync(textFilePath, text, 'utf8');
    console.log('Text saved to:', textFilePath);


    // Return both text and file info
    res.json({ 
      text: text,
      textFile: textFileName,
      textFilePath: textFilePath
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    // Clean up the uploaded PDF file
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
      console.log('Cleaned up uploaded file:', req.file.path);
    }
  }
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});