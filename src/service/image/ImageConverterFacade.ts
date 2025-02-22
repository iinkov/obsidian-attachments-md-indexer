import { FileDao } from "../../dao/FileDao";
import { BaseImageConverterService } from "./BaseImageConverterService";
import { PngConverterService } from "./PngConverterService";
import { JpegConverterService } from "./JpegConverterService";

export class ImageConverterFacade {
    private converters: BaseImageConverterService[];

    constructor(fileDao: FileDao, indexFolder: string) {
        this.converters = [
            new PngConverterService(fileDao, indexFolder),
            new JpegConverterService(fileDao, indexFolder)
        ];
    }

    async convertAllImageFiles(): Promise<void> {
        await Promise.all(
            this.converters.map(converter => converter.convertFiles())
        );
    }
} 