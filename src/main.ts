import {Plugin} from 'obsidian';
import {CanvasService} from './service/CanvasService';
import {FileDaoImpl} from './dao/FileDaoImpl';
import {ObsidianFileAdapter} from './dao/ObsidianFileAdapter';
import {FileAdapter} from './dao/FileAdapter';
import {SettingsServiceImpl} from "./service/SettingsService";
import {SettingsTab} from './utils/SettingsTab';
import {ImageConverterFacade} from './service/image/ImageConverterFacade';

export default class ObsidianIndexer extends Plugin {
	override async onload() {
		// Initialize settings manager and load settings
		const settingsService = new SettingsServiceImpl(this);
		await settingsService.loadSettings();

		// Initialize dependencies
		const fileAdapter: FileAdapter = new ObsidianFileAdapter(this.app);
		const fileDao = new FileDaoImpl(fileAdapter);
		const canvasService = new CanvasService(fileDao, settingsService);
		const imageConverter = new ImageConverterFacade(fileDao, settingsService.indexFolder);

		// Add settings tab
		this.addSettingTab(new SettingsTab(this.app, this, settingsService));

		// Add command for manual conversion
		this.addCommand({
			id: 'convert-canvas-files',
			name: 'Convert Canvas files to Markdown',
			callback: async () => {
				await canvasService.convertAllCanvasFiles();
			},
		});

		this.addCommand({
			id: 'convert-image-files',
			name: 'Convert Image files to Markdown',
			callback: async () => {
				await imageConverter.convertAllImageFiles();
			},
		});

		// Schedule a second conversion after 2-second delay if runOnStart is enabled
		if (settingsService.runOnStart) {
			window.setTimeout(async () => {
				await canvasService.convertAllCanvasFiles();
				await imageConverter.convertAllImageFiles();
			}, 2000);
		}
	}

	override onunload() {
		console.log('Obsidian Indexer plugin unloaded.');
	}
}
