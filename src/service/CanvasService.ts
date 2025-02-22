import { convertCanvasToMd } from '../utils/canvasToMd';
import { FileDao } from "../dao/FileDao";
import { CanvasServiceConfig } from "./CanvasServiceConfig";
import { BaseConverterService } from './BaseConverterService';

export class CanvasService extends BaseConverterService {
	constructor(fileDao: FileDao, config: CanvasServiceConfig) {
		super(fileDao, {
			indexFolder: config.indexFolder,
			sourceExtension: '.canvas',
			targetExtension: config.canvasPostfix
		});
	}

	async convertAllCanvasFiles(): Promise<void> {
		await this.convertFiles();
	}

	protected convertContent(content: string, fileName: string): string {
		return convertCanvasToMd(content, fileName);
	}
}
