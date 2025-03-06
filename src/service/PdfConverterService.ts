import { BaseConverterService } from './BaseConverterService';
import { FileDao, File } from "../dao/FileDao";
import { AttachmentParserService } from './AttachmentParserService';

export class PdfConverterService extends BaseConverterService {
    constructor(
        fileDao: FileDao, 
        indexFolder: string,
        private parser: AttachmentParserService
    ) {
        super(fileDao, {
            indexFolder,
            sourceExtension: '.pdf',
            targetExtension: '.pdf.md'
        });
    }

    protected async convertContent(source: File): Promise<string> {
        const buffer = await source.getBinaryContent();
        const content = await this.parser.parseAttachmentContent(buffer);
        return `# ${source.name}

![[${source.name}]]

# PDF Content

${content}
`;
    }

    override async convertFiles(): Promise<void> {
        if (!this.parser.validateApiKey()) {
            console.warn('No Google API key configured - PDF parsing will be skipped');
            return;
        }
        await super.convertFiles();
    }
} 