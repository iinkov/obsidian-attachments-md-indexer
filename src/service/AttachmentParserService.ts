import { GoogleGenerativeAI } from '@google/generative-ai';

export interface AttachmentParserConfig {
    getApiKey: () => string;
}

export interface AttachmentParserService {
    parseAttachmentContent(buffer: ArrayBuffer): Promise<string>;
    validateApiKey(): boolean;
}

export class GeminiAttachmentParserService implements AttachmentParserService {
    constructor(
        private config: AttachmentParserConfig,
        private readonly mimeType: string,
        private readonly prompt: string
    ) {
        this.validateApiKey();
    }

    validateApiKey(): boolean {
        const apiKey = this.config.getApiKey();
        return !!apiKey;
    }

    async parseAttachmentContent(buffer: ArrayBuffer): Promise<string> {
        try {
            // Initialize the Gemini API with your API key
            const genAI = new GoogleGenerativeAI(this.config.getApiKey());
            
            // Get the Gemini Pro Vision model
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });
            
            // Convert ArrayBuffer to base64
            const base64Data = Buffer.from(buffer).toString('base64');
            
            // Create data part in the format Gemini expects
            const dataPart = {
                inlineData: {
                    data: base64Data,
                    mimeType: this.mimeType
                }
            };

            const result = await model.generateContent([this.prompt, dataPart]);
            
            const response = result.response;
            const text = response.candidates?.[0]?.content?.parts?.[0]?.text || 'No content found';
            
            return text.trim();
        } catch (error) {
            // Create warning message for logs
            let warningMessage = '';
            let errorMessage = '## Content Processing Error\n\n';
            
            if (error instanceof Error) {
                // Check specifically for the payload size error
                if (error.message.includes('Request payload size exceeds the limit')) {
                    warningMessage = `⚠️ FILE SIZE ERROR: File is too large to process (exceeds 20MB limit)`;
                    errorMessage += '**Error**: File is too large to process (exceeds 20MB limit)\n\n';
                    errorMessage += '**Technical Details**: ' + error.message;
                } else {
                    warningMessage = `⚠️ PROCESSING ERROR: Failed to process content with Gemini`;
                    errorMessage += '**Error**: Failed to process content with Gemini\n\n';
                    errorMessage += '**Technical Details**: ' + error.message;
                }
            } else {
                warningMessage = `⚠️ UNKNOWN ERROR: Error occurred during processing`;
                errorMessage += '**Error**: Unknown error occurred during processing\n\n';
                errorMessage += '**Technical Details**: ' + String(error);
            }
            
            // Add file information to the warning message
            warningMessage += `\nFile Type: ${this.mimeType}`;
            warningMessage += `\nFile Size: ${(buffer.byteLength / (1024 * 1024)).toFixed(2)}MB`;
            
            // Log the warning with clear visibility
            console.warn('\n' + '='.repeat(80));
            console.warn(warningMessage);
            console.warn('='.repeat(80) + '\n');
            
            // Add timestamp to the error message for the .md file
            errorMessage += `\n\n**Timestamp**: ${new Date().toISOString()}`;
            errorMessage += `\n\n**File Size**: ${(buffer.byteLength / (1024 * 1024)).toFixed(2)}MB`;
            
            // Return the formatted error message - this will be stored in the .md file
            return errorMessage;
        }
    }
} 