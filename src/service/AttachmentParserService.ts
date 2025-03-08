import { GoogleGenerativeAI } from '@google/generative-ai';
import { Notice } from 'obsidian';

export interface AttachmentParserConfig {
    getApiKey: () => string;
}

export interface AttachmentParserService {
    parseAttachmentContent(fileSizeMB: number, getBuffer: () => Promise<ArrayBuffer>, filePath: string): Promise<string>;
    validateApiKey(): boolean;
}

export class FatalProcessingError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'FatalProcessingError';
    }
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

    private arrayBufferToBase64(buffer: ArrayBuffer): string {
        const uint8Array = new Uint8Array(buffer);
        let binary = '';
        uint8Array.forEach(byte => binary += String.fromCharCode(byte));
        return btoa(binary);
    }

    private readonly MAX_FILE_SIZE_MB = 30;

    private validateFileSize(fileSizeMB: number, filePath: string): string | null {
        if (fileSizeMB > this.MAX_FILE_SIZE_MB) {
            const message = `## File Too Large

This file exceeds the maximum size limit for Gemini AI processing.

**Details:**
- File size: ${fileSizeMB.toFixed(2)}MB
- Maximum allowed: ${this.MAX_FILE_SIZE_MB}MB
- File: ${filePath}

The file cannot be processed due to Gemini API limitations.`;
            return message;
        }
        return null;
    }

    private async tryGenerateContent(getBuffer: () => Promise<ArrayBuffer>, filePath: string, retryCount = 0, fileSizeMB: number): Promise<string> {
        // Check file size first
        const sizeError = this.validateFileSize(fileSizeMB, filePath);
        if (sizeError) {
            return sizeError;
        }

        try {
            const buffer = await getBuffer();
            const genAI = new GoogleGenerativeAI(this.config.getApiKey());
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
            
            const base64Data = this.arrayBufferToBase64(buffer);
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
            // If it's a 400 error (Bad Request), return formatted error message
            if (error instanceof Error && error.message.includes('400')) {
                console.warn(`⚠️ Processing Error\nFile: ${filePath}\nSize: ${fileSizeMB}MB`);
                return `## Processing Error

This file could not be processed by Gemini AI.

**Details:**
- File size: ${fileSizeMB}MB
- File type: ${this.mimeType}
- Error: ${error.message}

Please check the plugin documentation for troubleshooting steps.`;
            }

            // For other errors, retry up to 3 times
            if (retryCount < 3) {
                console.warn(`Retry attempt ${retryCount + 1} for ${filePath}`);
                await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Exponential backoff
                return this.tryGenerateContent(getBuffer, filePath, retryCount + 1, fileSizeMB);
            }

            // If all retries failed, throw a FatalProcessingError to stop the process
            throw new FatalProcessingError(`Failed to process file after 3 retries: ${filePath}`);
        }
    }

    async parseAttachmentContent(fileSizeMB: number, getBuffer: () => Promise<ArrayBuffer>, filePath: string): Promise<string> {
        return this.tryGenerateContent(getBuffer, filePath, 0, fileSizeMB);
    }
} 