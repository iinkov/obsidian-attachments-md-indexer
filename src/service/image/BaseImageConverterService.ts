import { BaseConverterService } from '../BaseConverterService';
import { FileDao } from "../../dao/FileDao";
import { INDEX_FILE_DESCRIPTION } from "../../utils/constants";

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

[[${fileName}]]

${INDEX_FILE_DESCRIPTION}

# Image Preview

![[${fileName}|500]]

# Image Details

- Type: ${this.getImageType()}
- Path: \`${fileName}\`
`;
    }

    protected abstract getImageType(): string;
} 