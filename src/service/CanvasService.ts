import { convertCanvasToMd } from '../utils/canvasToMd';
import { FileDao, File } from "../dao/FileDao";
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

	protected async convertContent(source: File): Promise<string> {
		const content = await source.getContent();
		return convertCanvasToMd(content, source.name);
	}
}
