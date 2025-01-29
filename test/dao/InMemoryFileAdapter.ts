import {File} from "../../src/dao/FileDao";
import {FileAdapter} from "../../src/dao/FileAdapter";

export class InMemoryFileAdapter implements FileAdapter {
	private storage: Map<string, string> = new Map();
	private modificationTimes: Map<string, number> = new Map();

	async createFolder(path: string): Promise<void> {
		if (!path) {
			throw new Error("Folder path cannot be empty");
		}
		if (path.includes('..')) {
			throw new Error("Relative paths are not allowed");
		}

		// Normalize path and ensure it ends with /
		const normalizedPath = path.endsWith('/') ? path : `${path}/`;

		// Create all parent folders if they don't exist
		const parts = normalizedPath.split('/').filter(Boolean);
		let currentPath = '';
		for (const part of parts) {
			currentPath += `${part}/`;
			if (!this.storage.has(`${currentPath}.folder`)) {
				this.storage.set(`${currentPath}.folder`, '');
			}
		}
	}

	async read(path: string): Promise<string> {
		try {
			if (!this.storage.has(path)) {
				throw new Error(`File not found: ${path}`);
			}
			const content = this.storage.get(path);
			if (content === undefined) {
				throw new Error(`File not found: ${path}`);
			}
			return content;
		} catch (e) {
			throw new Error(`Error reading file: ${path}`);
		}
	}

	async delete(path: string): Promise<void> {
		this.storage.delete(path);
	}

	async create(filePath: string, content: string): Promise<void> {
		if (this.storage.has(filePath)) {
			throw new Error('File already exists');
		}

		// Create parent folders if they don't exist
		const parentPath = filePath.split('/').slice(0, -1).join('/');
		if (parentPath) {
			await this.createFolder(parentPath);
		}

		this.storage.set(filePath, content);
		this.modificationTimes.set(filePath, Date.now());
	}

	async modify(filePath: string, content: string): Promise<void> {
		if (!this.storage.has(filePath)) {
			throw new Error(`Cannot modify non-existent file: ${filePath}`);
		}
		this.storage.set(filePath, content);
		this.modificationTimes.set(filePath, Date.now());
	}

	async getFiles(): Promise<File[]> {
		return Array.from(this.storage.entries())
			.filter(([path]) => !path.endsWith('/.folder'))
			.map(([path]) => {
				const name = path.split('/').pop() || path;

				if (!this.modificationTimes.has(path)) {
					this.modificationTimes.set(path, Date.now());
				}

				return new File(
					path,
					name,
					this.modificationTimes.get(path)!,
					async () => {
						const content = this.storage.get(path);
						if (content === undefined) {
							throw new Error(`File not found: ${path}`);
						}
						return content;
					}
				);
			});
	}

	clear(): void {
		this.storage.clear();
		this.modificationTimes.clear();
	}

}
