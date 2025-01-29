export interface StorageAdapter {
	exists(path: string): Promise<boolean>;

	mkdir(path: string): Promise<void>;

	read(path: string): Promise<string>;

	write(path: string, data: string): Promise<void>;

	delete(s: string): Promise<void>;
}
