import { BaseImageConverterService } from './BaseImageConverterService';
import { FileDao } from "../../dao/FileDao";

export class JpegConverterService extends BaseImageConverterService {
    constructor(fileDao: FileDao, indexFolder: string) {
        super(fileDao, {
            indexFolder,
            extension: '.jpg'
        });
    }

    protected getImageType(): string {
        return 'JPEG Image';
    }
} 