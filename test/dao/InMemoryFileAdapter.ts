import {File} from "../../src/dao/FileDao";
import {FileAdapter} from "../../src/dao/FileAdapter";
import {AdapterFile} from "../../src/dao/FileAdapter";

export class InMemoryFileAdapter implements FileAdapter {
	private storage: Map<string, string> = new Map();
	private modificationTimes: Map<string, number> = new Map();
	private creationTimes: Map<string, number> = new Map();
	private binaryStorage: Map<string, ArrayBuffer> = new Map();

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

	async rename(oldPath: string, newPath: string): Promise<void> {
		const normalize = (p: string) => p.endsWith('/') ? p : `${p}/`;
		const oldFolderPrefix = normalize(oldPath);
		const newFolderPrefix = normalize(newPath);

		// Handle exact match (file rename)
		if (this.storage.has(oldPath)) {
			this.storage.set(newPath, this.storage.get(oldPath)!);
			this.storage.delete(oldPath);
		}
		if (this.binaryStorage.has(oldPath)) {
			this.binaryStorage.set(newPath, this.binaryStorage.get(oldPath)!);
			this.binaryStorage.delete(oldPath);
		}
		
		// Handle folder contents rename
		const renameInMap = (map: Map<string, any>) => {
			for (const path of Array.from(map.keys())) {
				if (path.startsWith(oldFolderPrefix)) {
					const relativePath = path.substring(oldFolderPrefix.length);
					map.set(newFolderPrefix + relativePath, map.get(path));
					map.delete(path);
				}
			}
		};

		renameInMap(this.storage);
		renameInMap(this.binaryStorage);
		renameInMap(this.modificationTimes);
		renameInMap(this.creationTimes);
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
		const now = Date.now();
		this.modificationTimes.set(filePath, now);
		if (!this.creationTimes.has(filePath)) {
			this.creationTimes.set(filePath, now);
		}
	}

	async modify(filePath: string, content: string): Promise<void> {
		if (!this.storage.has(filePath)) {
			throw new Error(`Cannot modify non-existent file: ${filePath}`);
		}
		this.storage.set(filePath, content);
		this.modificationTimes.set(filePath, Date.now());
	}

	async createOrUpdateBinaryFile(filePath: string, content: ArrayBuffer): Promise<void> {
		// Create parent folders if they don't exist
		const parentPath = filePath.split('/').slice(0, -1).join('/');
		if (parentPath) {
			await this.createFolder(parentPath);
		}

		this.binaryStorage.set(filePath, content);
		const now = Date.now();
		this.modificationTimes.set(filePath, now);
		if (!this.creationTimes.has(filePath)) {
			this.creationTimes.set(filePath, now);
		}
	}

	async getFiles(): Promise<AdapterFile[]> {
		const textFiles = Array.from(this.storage.entries())
			.filter(([path]) => !path.endsWith('/.folder'))
			.map(([path]) => this.createAdapterFile(path, false));

		const binaryFiles = Array.from(this.binaryStorage.entries())
			.map(([path]) => this.createAdapterFile(path, true));

		return [...textFiles, ...binaryFiles];
	}

	private createAdapterFile(path: string, isBinary: boolean): AdapterFile {
		const name = path.split('/').pop() || path;
		
		if (!this.creationTimes.has(path)) {
			this.creationTimes.set(path, Date.now());
		}
		
		if (!this.modificationTimes.has(path)) {
			this.modificationTimes.set(path, this.creationTimes.get(path)!);
		}

		const sizeInBytes = isBinary 
			? (this.binaryStorage.get(path)?.byteLength || 0)
			: (new TextEncoder().encode(this.storage.get(path) || '').length);

		return {
			path,
			name,
			modifiedTime: this.modificationTimes.get(path)!,
			creationTime: this.creationTimes.get(path)!,
			sizeInBytes
		};
	}

	async readBinary(filePath: string): Promise<ArrayBuffer> {
		if (!this.binaryStorage.has(filePath)) {
			throw new Error(`Binary file not found: ${filePath}`);
		}
		const content = this.binaryStorage.get(filePath);
		if (!content) {
			throw new Error(`Binary file not found: ${filePath}`);
		}
		return content;
	}

	clear(): void {
		this.storage.clear();
		this.modificationTimes.clear();
		this.creationTimes.clear();
		this.binaryStorage.clear();
	}

}
