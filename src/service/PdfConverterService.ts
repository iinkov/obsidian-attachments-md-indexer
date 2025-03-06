import { BaseConverterService } from './BaseConverterService';
import { FileDao, File } from "../dao/FileDao";
import { PDF_FILE_DESCRIPTION } from "../utils/constants";
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
        const content = await this.parser.parseAttachmentContent(buffer, source.path);
        return `# ${source.name}

![[${source.name}#height=500]]

${PDF_FILE_DESCRIPTION}

# PDF Content

${content}
`;
    }

    override async convertFiles(): Promise<void> {
        if (!this.parser.validateApiKey()) {
            console.warn('No Google API key configured - PDF parsing will be skipped');
            return;
        }
        try {
            await super.convertFiles();
        } catch (error) {
            console.error('Conversion process stopped due to API errors. Please try again later.');
            // Re-throw to stop the entire process
            throw error;
        }
    }
} 