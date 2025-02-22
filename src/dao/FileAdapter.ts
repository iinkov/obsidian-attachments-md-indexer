import {File} from './FileDao';

export interface FileAdapter {
	createFolder(folderPath: string): Promise<void>;

	getFiles(): Promise<File[]>;

	read(filePath: string): Promise<string>;

	readBinary(filePath: string): Promise<ArrayBuffer>;

	create(filePath: string, content: string): Promise<void>;

	delete(path: string): Promise<void>;

	modify(filePath: string, content: string): Promise<void>;
}
