import { BaseConverterService } from '../BaseConverterService';
import { FileDao } from "../../dao/FileDao";
import { INDEX_FILE_DESCRIPTION } from "../../utils/constants";
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

    protected convertContent(content: string, fileName: string): string {
        return `# ${fileName}

![[${fileName}|500]]

${INDEX_FILE_DESCRIPTION}

${parseImageContent(fileName)}`;
    }

    protected abstract getImageType(): string;
} 