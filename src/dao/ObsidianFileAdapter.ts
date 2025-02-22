import {App, TFile, TAbstractFile} from 'obsidian';
import {FileAdapter} from './FileAdapter';
import {File} from "./FileDao";

export class ObsidianFileAdapter implements FileAdapter {
	constructor(private app: App) {
	}

	async getFiles(): Promise<File[]> {
		const files = await this.app.vault.getFiles();
		return Promise.all(
			files.map(async file =>
				new File(
					file.path,
					file.name,
					file.stat.mtime,
					async () => {
						const f = this.app.vault.getAbstractFileByPath(file.path);
						if (f && f instanceof TFile) {
							return this.app.vault.read(f);
						}
						throw new Error(`File not found: ${file.path}`);
					},
					async () => {
						const f = this.app.vault.getAbstractFileByPath(file.path);
						if (f && f instanceof TFile) {
							return this.app.vault.readBinary(f);
						}
						throw new Error(`File not found: ${file.path}`);
					}
				)
			)
		);
	}

	async createFolder(folderPath: string): Promise<void> {
		if (!this.app.vault.getAbstractFileByPath(folderPath)) {
			await this.app.vault.createFolder(folderPath);
		}
	}

	async read(filePath: string): Promise<string> {
		const file = this.app.vault.getAbstractFileByPath(filePath);
		if (!file || !(file instanceof TFile)) {
			throw new Error(`File not found: ${filePath}`);
		}
		return this.app.vault.read(file);
	}

	async create(filePath: string, content: string): Promise<void> {
		await this.app.vault.create(filePath, content);
	}

	async modify(filePath: string, content: string): Promise<void> {
		const file = this.app.vault.getAbstractFileByPath(filePath);
		if (!file || !(file instanceof TFile)) {
			throw new Error(`File not found: ${filePath}`);
		}
		await this.app.vault.modify(file, content);
	}

	async delete(filePath: string): Promise<void> {
		const file = this.app.vault.getAbstractFileByPath(filePath);
		if (!file) {
			throw new Error(`File not found: ${filePath}`);
		}
		await this.app.fileManager.trashFile(file);
	}

	async readBinary(filePath: string): Promise<ArrayBuffer> {
		const file = this.app.vault.getAbstractFileByPath(filePath);
		if (!file || !(file instanceof TFile)) {
			throw new Error(`File not found: ${filePath}`);
		}
		return this.app.vault.readBinary(file);
	}
}
