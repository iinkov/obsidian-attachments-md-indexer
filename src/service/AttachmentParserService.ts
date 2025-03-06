import { GoogleGenerativeAI } from '@google/generative-ai';

export interface AttachmentParserConfig {
    getApiKey: () => string;
}

export interface AttachmentParserService {
    parseAttachmentContent(buffer: ArrayBuffer, filePath: string): Promise<string>;
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

    private async tryGenerateContent(buffer: ArrayBuffer, filePath: string, retryCount = 0): Promise<string> {
        try {
            const genAI = new GoogleGenerativeAI(this.config.getApiKey());
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });
            
            const base64Data = Buffer.from(buffer).toString('base64');
            const dataPart = {
                inlineData: {
                    data: base64Data,
                    mimeType: this.mimeType
                }
            };

            const result = await model.generateContent([this.prompt, dataPart]);
            const text = result.response.candidates?.[0]?.content?.parts?.[0]?.text || 'No content found';
            return text.trim();
        } catch (error) {
            const fileSizeInMB = (buffer.byteLength / (1024 * 1024)).toFixed(2);
            
            // If it's a 400 error (Bad Request), return formatted error message
            if (error instanceof Error && error.message.includes('400')) {
                console.warn(`⚠️ Processing Error\nFile: ${filePath}\nSize: ${fileSizeInMB}MB`);
                return `## Processing Error

This file could not be processed by Gemini AI.

**Details:**
- File size: ${fileSizeInMB}MB
- File type: ${this.mimeType}
- Error: ${error.message}

Please check the plugin documentation for troubleshooting steps.`;
            }

            // For other errors, retry up to 3 times
            if (retryCount < 3) {
                console.warn(`Retry attempt ${retryCount + 1} for ${filePath}`);
                await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Exponential backoff
                return this.tryGenerateContent(buffer, filePath, retryCount + 1);
            }

            // If all retries failed, throw error to stop the process
            throw new Error(`Failed to process file after 3 retries: ${filePath}`);
        }
    }

    async parseAttachmentContent(buffer: ArrayBuffer, filePath: string): Promise<string> {
        return this.tryGenerateContent(buffer, filePath);
    }
} 