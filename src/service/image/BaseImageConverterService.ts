import { BaseConverterService } from '../BaseConverterService';
import { FileDao, File } from "../../dao/FileDao";
import { IMAGE_FILE_DESCRIPTION } from "../../utils/constants";
import { parseImageContent } from '../../utils/imageParser';

export abstract class BaseImageConverterService extends BaseConverterService {
    constructor(
        fileDao: FileDao,
        config: { indexFolder: string; extension: string }
    ) {
        super(fileDao, {
            indexFolder: config.indexFolder,
            sourceExtension: config.extension,
            targetExtension: `${config.extension}.md`
        });
    }

    protected async convertContent(source: File): Promise<string> {
        const imageContent = await parseImageContent(source.name);
        return `# ${source.name}

![[${source.name}|500]]

${IMAGE_FILE_DESCRIPTION}

${imageContent}`;
    }

    protected abstract getImageType(): string;
} 