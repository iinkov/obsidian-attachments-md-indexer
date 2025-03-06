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
            console.error('Error parsing content with Gemini:', error);
            if (error instanceof Error) {
                console.error('Error details:', error.message);
            }
            return 'Failed to parse content with Gemini';
        }
    }
} 