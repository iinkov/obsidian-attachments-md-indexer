import { BaseImageConverterService } from './BaseImageConverterService';
import { FileDao } from "../../dao/FileDao";

export class PngConverterService extends BaseImageConverterService {
    constructor(fileDao: FileDao, indexFolder: string) {
        super(fileDao, {
            indexFolder,
            extension: '.png'
        });
    }

    protected getImageType(): string {
        return 'PNG Image';
    }
} 