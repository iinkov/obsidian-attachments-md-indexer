import { BaseImageConverterService } from './BaseImageConverterService';
import { FileDao, File } from "../../dao/FileDao";
import { parseImageContent } from '../../utils/imageParser';
import { IMAGE_FILE_DESCRIPTION } from "../../utils/constants";

export class PngConverterService extends BaseImageConverterService {
    constructor(fileDao: FileDao, indexFolder: string) {
        super(fileDao, {
            indexFolder,
            extension: '.png'
        });
    }

    protected async convertContent(source: File): Promise<string> {
        const imageBuffer = await source.getBinaryContent();
        const imageContent = await parseImageContent(imageBuffer);
        return `# ${source.name}

        ![[${source.name}|500]]

        ${IMAGE_FILE_DESCRIPTION}

        # Image Content

        ${imageContent}`;
    }

    protected getImageType(): string {
        return 'PNG Image';
    }
} 