import { GoogleGenerativeAI } from '@google/generative-ai';

export interface ImageParserConfig {
    getApiKey: () => string;
}

export interface ImageParserService {
    parseImageContent(imageBuffer: ArrayBuffer): Promise<string>;
    validateApiKey(): boolean;
}

export class GeminiImageParserService implements ImageParserService {
    constructor(
        private config: ImageParserConfig,
        private readonly mimeType: string
    ) {
        this.validateApiKey();
    }

    validateApiKey(): boolean {
        const apiKey = this.config.getApiKey();
        return !!apiKey;
    }

    async parseImageContent(imageBuffer: ArrayBuffer): Promise<string> {
        try {
            // Initialize the Gemini API with your API key
            const genAI = new GoogleGenerativeAI(this.config.getApiKey());
            
            // Get the Gemini Pro Vision model
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });
            
            // Convert ArrayBuffer to base64
            const base64Image = Buffer.from(imageBuffer).toString('base64');
            
            // Create image part in the format Gemini expects
            const imagePart = {
                inlineData: {
                    data: base64Image,
                    mimeType: this.mimeType
                }
            };

            // Generate content
            const result = await model.generateContent([
                "Parse text from the image. Return full text and also give me description of the image",
                imagePart
            ]);
            
            // Access response directly without additional await
            const response = result.response;
            const text = response.candidates?.[0]?.content?.parts?.[0]?.text || 'No text found in image';
            
            return text.trim();
        } catch (error) {
            console.error('Error parsing image with Gemini:', error);
            if (error instanceof Error) {
                console.error('Error details:', error.message);
            }
            return 'Failed to parse image content with Gemini';
        }
    }
} 