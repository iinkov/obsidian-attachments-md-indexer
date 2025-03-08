import {App, TFile, TAbstractFile} from 'obsidian';
import {FileAdapter} from './FileAdapter';
import {File} from "./FileDao";
import {AdapterFile} from './FileAdapter';

export class ObsidianFileAdapter implements FileAdapter {
	constructor(private app: App) {
	}

	async getFiles(): Promise<AdapterFile[]> {
		const files = await this.app.vault.getFiles();
		return files.map(file => ({
			path: file.path,
			name: file.name,
			modifiedTime: file.stat.mtime,
			sizeInBytes: file.stat.size
		}));
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
