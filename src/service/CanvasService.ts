import {convertCanvasToMd} from '../utils/canvasToMd';
import {File, FileDao} from "../dao/FileDao";
import {CanvasServiceConfig} from "./CanvasServiceConfig";

export class CanvasService {

	constructor(
		private fileDao: FileDao,
		private config: CanvasServiceConfig
	) {
	}

	async convertAllCanvasFiles(): Promise<void> {
		try {
			// Ensure index folder exists before processing
			await this.fileDao.createFolder(this.config.indexFolder);

			const allFiles = await this.fileDao.getFiles();
			const canvasFiles = allFiles.filter(f => f.path.endsWith(".canvas"));
			const convertedFiles = allFiles.filter(f =>
				f.path.startsWith(`${this.config.indexFolder}/`) &&
				f.path.endsWith(this.config.canvasPostfix)
			);

			const [removedFiles, createdFiles, modifiedFiles] = await Promise.all([
				this.removeOrphanedFiles(convertedFiles, canvasFiles),
				this.createConvertedFiles(canvasFiles, convertedFiles),
				this.modifyConvertedFiles(canvasFiles, convertedFiles),
			]);

			this.logConversionResults(removedFiles, createdFiles, modifiedFiles, canvasFiles.length);
		} catch (error) {
			console.error('Error during conversion:', error);
		}
	}

	private getCanvasName(file: File): string {
		return file.name.replace(this.config.canvasPostfix, '.canvas');
	}

	private getConvertedFilePath(canvasName: string): string {
		return `${this.config.indexFolder}/${canvasName.replace('.canvas', '')}${this.config.canvasPostfix}`;
	}

	private async removeOrphanedFiles(convertedFiles: File[], canvasFiles: File[]): Promise<string[]> {
		const canvasNames = new Set(canvasFiles.map(f => f.name));

		const removedFiles = convertedFiles
			.filter(convertedFile => {
				const canvasName = this.getCanvasName(convertedFile);
				return !canvasNames.has(canvasName);
			})
			.map(async (convertedFile) => {
				try {
					await this.fileDao.deleteFile(convertedFile.path);
					return convertedFile.path;
				} catch (error) {
					console.error(`Failed to remove converted file ${convertedFile.path}:`, error);
					return null;
				}
			});

		return (await Promise.all(removedFiles)).filter(path => path !== null) as string[];
	}

	private async createConvertedFiles(canvasFiles: File[], convertedFiles: File[]): Promise<{
		count: number;
		files: string[]
	}> {
		const convertedCanvasNames = new Set(convertedFiles.map(f => this.getCanvasName(f)));

		const createPromises = canvasFiles
			.filter(canvas => {
				return !convertedCanvasNames.has(canvas.name);
			})
			.map(async canvas => {
				const mdPath = this.getConvertedFilePath(canvas.name);
				await this.convertAndSave(canvas, mdPath);
				return canvas.name;
			});

		const createdFiles = await Promise.all(createPromises);
		return {count: createdFiles.length, files: createdFiles};
	}

	private async modifyConvertedFiles(canvasFiles: File[], convertedFiles: File[]): Promise<{
		count: number;
		files: string[]
	}> {
		// Create a map of converted files for quick lookup
		const convertedFileMap = new Map(
			convertedFiles.map(convertedFile => [
				this.getCanvasName(convertedFile),
				convertedFile
			])
		);

		// Find intersection of canvas files that have converted counterparts
		const modifiedFiles = canvasFiles
			.filter(canvas => {
				const convertedFile = convertedFileMap.get(canvas.name);
				return convertedFile && canvas.modifiedTime >= convertedFile.modifiedTime;
			})
			.map(async canvas => {
				const mdPath = this.getConvertedFilePath(canvas.name);
				await this.convertAndSave(canvas, mdPath);
				return canvas.name;
			});

		const modifiedFileNames = await Promise.all(modifiedFiles);
		return {count: modifiedFileNames.length, files: modifiedFileNames};
	}

	private async convertAndSave(canvas: File, mdPath: string): Promise<void> {
		const content = await canvas.getContent();
		const markdownContent = convertCanvasToMd(content, canvas.name);
		await this.fileDao.createOrUpdateFile(mdPath, markdownContent);
	}

	private logConversionResults(removedFiles: string[], createdFiles: {
		count: number;
		files: string[]
	}, modifiedFiles: { count: number; files: string[] }, totalCanvases: number): void {
		console.log(
			`Canvas indexing completed successfully\n` +
			`Total Canvases processed ${createdFiles.count + modifiedFiles.count + removedFiles.length}/${totalCanvases}\n` +
			`Created files ${createdFiles.count}\n` +
			(createdFiles.count > 0 ?
				`  ${createdFiles.files.map(f => `- ${f.replace('.canvas', '')}`).join('\n  ')}\n` : '') +
			`Modified files ${modifiedFiles.count}\n` +
			(modifiedFiles.count > 0 ?
				`  ${modifiedFiles.files.map(f => `- ${f.replace('.canvas', '')}`).join('\n  ')}\n` : '') +
			`Deleted files ${removedFiles.length}\n` +
			(removedFiles.length > 0 ?
				`  ${removedFiles.map(f => `- ${f.replace(`${this.config.indexFolder}/`, '').replace('.canvas.md', '')}`).join('\n  ')}\n` : '')
		);
	}
}
