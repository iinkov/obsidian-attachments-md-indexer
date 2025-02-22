import { BaseConverterService } from './BaseConverterService';
import { FileDao, File } from "../dao/FileDao";
import { IMAGE_FILE_DESCRIPTION } from "../utils/constants";
import { ImageParserService } from './ImageParserService';

export class PngConverterService extends BaseConverterService {
    constructor(
        fileDao: FileDao, 
        indexFolder: string,
        private imageParser: ImageParserService
    ) {
        super(fileDao, {
            indexFolder,
            sourceExtension: '.png',
            targetExtension: '.png.md'
        });
    }

    protected async convertContent(source: File): Promise<string> {
        const imageBuffer = await source.getBinaryContent();
        const imageContent = await this.imageParser.parseImageContent(imageBuffer);
        return `# ${source.name}

![[${source.name}|500]]

${IMAGE_FILE_DESCRIPTION}

# Image Content

${imageContent}
`;  // Note the extra newline at the end
    }

    override async convertFiles(): Promise<void> {
        if (!this.imageParser.validateApiKey()) {
            console.warn('No Google API key configured - image parsing will be skipped');
            return;
        }
        await super.convertFiles();
    }
} 