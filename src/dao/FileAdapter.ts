import {File} from './FileDao';

export interface FileAdapter {
	createFolder(folderPath: string): Promise<void>;

	getFiles(): Promise<File[]>;

	read(filePath: string): Promise<string>;

	create(filePath: string, content: string): Promise<void>;

	delete(path: string): Promise<void>;

	modify(filePath: string, content: string): Promise<void>;
}
