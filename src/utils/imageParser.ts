import { createWorker } from 'tesseract.js';
import { readFileSync } from 'fs';
import { extname } from 'path';

export async function parseImageContent(filePath: string): Promise<string> {
    try {
        const supportedFormats = ['.png', '.jpg', '.jpeg', '.bmp', '.pbm'];
        const ext = extname(filePath).toLowerCase();
        
        if (!supportedFormats.includes(ext)) {
            return `# Image Content\n\nUnsupported image format: ${ext}`;
        }

        // Create a Tesseract worker
        const worker = await createWorker();
        
        // Initialize worker with English language
        await worker.loadLanguage('eng');
        await worker.initialize('eng');
        
        // Read the image file as buffer
        const imageBuffer = readFileSync(filePath);
        
        // Perform OCR on the image
        const { data: { text } } = await worker.recognize(imageBuffer);
        
        // Terminate worker to free up resources
        await worker.terminate();

        // Return the extracted text
        return text.trim() ? `# Image Content\n\n${text.trim()}` : '# Image Content\n\nNo text found in image';
    } catch (error) {
        console.error('Error parsing image:', error);
        return '# Image Content\n\nFailed to parse image content';
    }
} 