import {App} from 'obsidian';
import {StorageAdapter} from './StorageAdapter';

export class ObsidianStorageAdapter implements StorageAdapter {
	constructor(private app: App) {
	}

	async exists(path: string): Promise<boolean> {
		return this.app.vault.adapter.exists(path);
	}

	async mkdir(path: string): Promise<void> {
		return this.app.vault.adapter.mkdir(path);
	}

	async read(path: string): Promise<string> {
		return this.app.vault.adapter.read(path);
	}

	async write(path: string, data: string): Promise<void> {
		return this.app.vault.adapter.write(path, data);
	}

	async delete(path: string): Promise<void> {
		const file = this.app.vault.getAbstractFileByPath(path);
		if (file) {
			await this.app.fileManager.trashFile(file);
		}
	}
}
