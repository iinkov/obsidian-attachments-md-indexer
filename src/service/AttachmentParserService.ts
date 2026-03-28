import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
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
    // RAM-only global state for daily limits
    public static pauseAllUntilMs: number = 0;

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

    private readonly MAX_FILE_SIZE_MB = 22;

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
            // Base delay to prevent hitting the 15 RPM limit on free tier (~4s per API request)
            if (retryCount === 0) {
                await new Promise(resolve => setTimeout(resolve, 3500));
            }

            const buffer = await getBuffer();
            const genAI = new GoogleGenerativeAI(this.config.getApiKey());
            const model = genAI.getGenerativeModel({
                model: "gemini-3.1-flash-lite-preview",
                safetySettings: [
                    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                ],
                generationConfig: {
                    temperature: 0.1,
                    topP: 1,
                    maxOutputTokens: 2048,
                }
            });

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
        } catch (error: any) {
            // If it's a 400 error (Bad Request - e.g. file too large/corrupt),
            // write a stub and continue WITHOUT pausing. This avoids infinite loops.
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

            // For any other error (including 429 or 502/503 traffic jams), retry up to 3 times
            if (retryCount < 3) {
                // Aggressive backoff: 5s, 20s, 65s (to safely clear the 60s RPM window)
                const delays = [5000, 20000, 90000];
                const delay = delays[retryCount];

                console.warn(`⚠️ API Error (Retry ${retryCount + 1}/3): Waiting ${delay / 1000}s for ${filePath}`);
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.tryGenerateContent(getBuffer, filePath, retryCount + 1, fileSizeMB);
            }

            // All 3 retries exhausted — assume quota limit and pause for 24h
            const resumeAt = Date.now() + 24 * 60 * 60 * 1000;
            GeminiAttachmentParserService.pauseAllUntilMs = resumeAt;
            const timeStr = new Date(resumeAt).toLocaleString();
            new Notice(`⚠️ AI indexing paused until ${timeStr} (quota limit reached)`);
            throw new FatalProcessingError(`AI quota exhausted. Pausing until ${timeStr}`);
        }
    }

    async parseAttachmentContent(fileSizeMB: number, getBuffer: () => Promise<ArrayBuffer>, filePath: string): Promise<string> {
        if (Date.now() < GeminiAttachmentParserService.pauseAllUntilMs) {
            const timeStr = new Date(GeminiAttachmentParserService.pauseAllUntilMs).toLocaleString();
            throw new FatalProcessingError(`AI indexing paused until ${timeStr}. Quota limit was reached.`);
        }
        return this.tryGenerateContent(getBuffer, filePath, 0, fileSizeMB);
    }
} 