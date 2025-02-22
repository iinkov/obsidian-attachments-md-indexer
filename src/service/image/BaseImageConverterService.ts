import { BaseConverterService } from '../BaseConverterService';
import { FileDao } from "../../dao/FileDao";
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

    protected async convertContent(content: string, fileName: string): Promise<string> {
        const imageContent = await parseImageContent(fileName);
        return `# ${fileName}

![[${fileName}|500]]

${IMAGE_FILE_DESCRIPTION}

${imageContent}`;
    }

    protected abstract getImageType(): string;
} 