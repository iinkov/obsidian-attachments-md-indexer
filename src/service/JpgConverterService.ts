import { BaseConverterService } from './BaseConverterService';
import { FileDao, File } from "../dao/FileDao";
import { IMAGE_FILE_DESCRIPTION } from "../utils/constants";
import { AttachmentParserService } from './AttachmentParserService';

export class JpgConverterService extends BaseConverterService {
    constructor(
        fileDao: FileDao, 
        indexFolder: string,
        private parser: AttachmentParserService
    ) {
        super(fileDao, {
            indexFolder,
            sourceExtension: '.jpg',
            targetExtension: '.jpg.md'
        });
    }

    protected async convertContent(source: File): Promise<string> {
        const buffer = await source.getBinaryContent();
        const content = await this.parser.parseAttachmentContent(buffer, source.path);
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