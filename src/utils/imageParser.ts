import { createWorker } from 'tesseract.js';

export async function parseImageContent(imageBuffer: ArrayBuffer): Promise<string> {
    try {
        // Create a Tesseract worker
        const worker = await createWorker();
        
        // Initialize worker with English language
        await worker.loadLanguage('eng');
        await worker.initialize('eng');
        
        // Perform OCR on the image buffer directly
        const { data: { text } } = await worker.recognize(imageBuffer);
        
        // Terminate worker to free up resources
        await worker.terminate();

        // Return the extracted text
        return text.trim() ? text.trim() : 'No text found in image';
    } catch (error) {
        console.error('Error parsing image:', error);
        return 'Failed to parse image content';
    }
} 