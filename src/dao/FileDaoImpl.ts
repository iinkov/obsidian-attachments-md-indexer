import {File, FileDao} from "./FileDao";
import {FileAdapter} from "./FileAdapter";
import {
	INDEX_FILE_DESCRIPTION, 
	IMAGE_FILE_DESCRIPTION,
	PDF_FILE_DESCRIPTION
} from "../utils/constants";

export class FileDaoImpl implements FileDao {
	constructor(private fileAdapter: FileAdapter) {
	}

	async readFile(path: string): Promise<string | undefined> {
		try {
			return await this.fileAdapter.read(path);
		} catch (e) {
			return undefined;
		}
	}

	async deleteFile(path: string): Promise<void> {
		// Verify file contains one of the valid description markers before deletion
		const content = await this.readFile(path);
		if (content && 
			!content.includes(INDEX_FILE_DESCRIPTION) && 
			!content.includes(IMAGE_FILE_DESCRIPTION) &&
			!content.includes(PDF_FILE_DESCRIPTION)) {
			throw new Error(`Cannot delete file at ${path} - it does not appear to be an index file`);
		}
		await this.fileAdapter.delete(path);
	}

	async createOrUpdateFile(path: string, content: string): Promise<void> {
		try {
			// First try to modify existing file
			await this.fileAdapter.modify(path, content);
		} catch (e) {
			// If modify fails, try to create new file
			try {
				await this.fileAdapter.create(path, content);
			} catch (createError) {
				console.error(`Error in createOrUpdateFile for path ${path}:`, createError);
				throw createError;
			}
		}
	}

	async getFiles(): Promise<File[]> {
		const files = (await this.fileAdapter.getFiles());
		return files
			.map(file => new File(
				file.path,
				file.name,
				file.modifiedTime,
				async () => {
					const content = await this.fileAdapter.read(file.path);
					if (content === undefined) {
						throw new Error(`File not found: ${file.path}`);
					}
					return content;
				},
				async () => {
					const content = this.fileAdapter.readBinary(file.path);
					if (content === undefined) {
						throw new Error(`File not found: ${file.path}`);
					}
					return content;
				}
			));
	}

	async createFolder(path: string): Promise<void> {
		await this.fileAdapter.createFolder(path);
	}
}
