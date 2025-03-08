export class File {
	constructor(
		public path: string,
		public name: string,
		public modifiedTime: number,
		public sizeInBytes: number,
		private contentResolver: () => Promise<string>,
		private binaryContentResolver: () => Promise<ArrayBuffer>
	) {
	}

	get sizeInMB(): number {
		return this.sizeInBytes / (1024 * 1024);
	}

	async getContent(): Promise<string> {
		return this.contentResolver();
	}

	async getBinaryContent(): Promise<ArrayBuffer> {
		return this.binaryContentResolver();
	}
}

export interface FileDao {
	deleteFile(filePath: string): Promise<void>;

	createFolder(folderPath: string): Promise<void>;

	getFiles(): Promise<File[]>;

	createOrUpdateFile(filePath: string, content: string): Promise<void>;

	readFile(filePath: string): Promise<string | undefined>;
}
