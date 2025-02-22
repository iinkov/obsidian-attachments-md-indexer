import { createWorker } from 'tesseract.js';

export async function parseImageContent(imageBuffer: ArrayBuffer): Promise<string> {
    try {
        // Create a worker and load multiple languages
        const worker = await createWorker('eng+rus+pol');
        
        // Convert ArrayBuffer to Buffer
        const buffer = Buffer.from(imageBuffer);
        
        // Recognize text with Tesseract
        const { data: { text } } = await worker.recognize(buffer);
        
        // Clean up worker resources
        await worker.terminate();
        
        return text.trim() || 'No text found in image';
    } catch (error) {
        console.error('Error parsing image:', error);
        return 'Failed to parse image content';
    }
} 