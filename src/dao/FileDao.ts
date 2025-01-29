export class File {
	constructor(
		public path: string,
		public name: string,
		public modifiedTime: number,
		private contentResolver: () => Promise<string>
	) {
	}

	async getContent(): Promise<string> {
		return this.contentResolver();
	}
}

export interface FileDao {
	deleteFile(filePath: string): Promise<void>;

	createFolder(folderPath: string): Promise<void>;

	getFiles(): Promise<File[]>;

	createOrUpdateFile(filePath: string, content: string): Promise<void>;

	readFile(filePath: string): Promise<string | undefined>;
}
