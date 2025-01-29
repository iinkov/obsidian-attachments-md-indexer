export interface Plugin {
	manifest: {
		dir: string;
	};
	app: any;

	onload(): void;

	addRibbonIcon(icon: string, title: string, callback: (evt: MouseEvent) => void): void;

	addStatusBarItem(): void;

	addCommand(command: any): void;

	removeCommand(commandId: string): void;

	addSettingTab(tab: any): void;

	registerView(type: string, viewCreator: any): void;

	loadData(): Promise<any>;

	saveData(data: any): Promise<void>;

	registerEvent(event: any): void;

	registerInterval(id: any): void;

	registerMarkdownPostProcessor(processor: any): void;

	registerCodeMirror(callback: any): void;

	registerDomEvent(el: any, type: string, callback: any): void;

	registerObsidianProtocolHandler(protocol: string, handler: any): void;

	registerExtensions(extensions: string[], processor: any): void;

	[key: string]: any; // Allow any other properties
}

export interface FileStats {
	mtime: number;
}

export interface TFile {
	path: string;
	name: string;
	extension: string;
	stat: FileStats;

	read(): Promise<string>;
}

export interface TFolder {
	path: string;
}
