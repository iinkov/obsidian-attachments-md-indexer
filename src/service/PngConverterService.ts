import { BaseConverterService } from './BaseConverterService';
import { FileDao, File } from "../dao/FileDao";
import { IMAGE_FILE_DESCRIPTION } from "../utils/constants";
import { AttachmentParserService } from './AttachmentParserService';

export class PngConverterService extends BaseConverterService {
    constructor(
        fileDao: FileDao, 
        indexFolder: string,
        private parser: AttachmentParserService
    ) {
        super(fileDao, {
            indexFolder,
            sourceExtension: '.png',
            targetExtension: '.png.md'
        });
    }

    protected async convertContent(source: File): Promise<string> {
        const content = await this.parser.parseAttachmentContent(source.sizeInMB, () => source.getBinaryContent(), source.path);
        return `# ${source.name}

![[${source.name}|500]]

${IMAGE_FILE_DESCRIPTION}

# Image Content

${content}
`;
    }

    override async convertFiles(): Promise<void> {
        if (!this.parser.validateApiKey()) {
            console.warn('No Google API key configured - image parsing will be skipped');
            return;
        }
        await super.convertFiles();
    }
} 