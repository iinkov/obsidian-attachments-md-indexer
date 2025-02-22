export class File {
	constructor(
		public path: string,
		public name: string,
		public modifiedTime: number,
		private contentResolver: () => Promise<string>,
		private binaryContentResolver: () => Promise<ArrayBuffer>
	) {
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
