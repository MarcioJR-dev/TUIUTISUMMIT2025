import Tesseract from 'tesseract.js';
import pdf from 'pdf-poppler';
import fs from 'fs';
import path from 'path';

export async function convertPDFToImages(pdfPath) {
  console.log("Converting PDF to images using pdf-poppler...");
  console.log("PDF path:", pdfPath);
  console.log("PDF exists:", fs.existsSync(pdfPath));

  const outputDir = path.join(path.dirname(pdfPath), 'poppler_' + Date.now());
  console.log("Output directory:", outputDir);
  fs.mkdirSync(outputDir);

  try {
    const options = {
      format: 'png',
      out_dir: outputDir,
      out_prefix: 'page',
      page: null // Convert all pages
    };

    console.log("Starting PDF conversion...");
    await pdf.convert(pdfPath, options);

    // Get all generated image files
    const imageFiles = fs.readdirSync(outputDir)
      .filter(f => f.endsWith('.png'))
      .map(f => path.join(outputDir, f))
      .sort(); // Sort to maintain page order

    console.log(`Conversion successful! Generated ${imageFiles.length} images`);

    return {
      outputDir,
      imagePaths: imageFiles
    };
  } catch (error) {
    console.error("PDF conversion failed:", error);
    throw error;
  }
}

export async function recognizeTextFromImages(imagePaths, lang = 'por') {
  console.log("Recognizing text from images...");

  let fullText = '';
  
  for (let i = 0; i < imagePaths.length; i++) {
    console.log(`Processing page ${i + 1}/${imagePaths.length}...`);
    const ocrResult = await Tesseract.recognize(imagePaths[i], lang, { 
      logger: m => console.log(m) 
    });
    fullText += ocrResult.data.text + '\n';
  }
  
  return fullText;
}

export async function extractTextFromPDF(pdfPath, lang = 'por') {
  let conversionResult;
  
  try {
    console.log("Attempting to extract text from PDF...");

    // Step 1: Convert PDF to images
    conversionResult = await convertPDFToImages(pdfPath);
    
    // Step 2: Extract text from images
    const text = await recognizeTextFromImages(conversionResult.imagePaths, lang);
    
    console.log("Successfully extracted the text!");

    return text;
  } finally {
    // Clean up images
    if (conversionResult) {
      conversionResult.imagePaths.forEach(imagePath => {
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      });
      if (fs.existsSync(conversionResult.outputDir)) {
        fs.rmdirSync(conversionResult.outputDir);
      }
    }
  }
}