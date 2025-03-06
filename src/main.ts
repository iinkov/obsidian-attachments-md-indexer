import {Plugin} from 'obsidian';
import {CanvasService} from './service/CanvasService';
import {FileDaoImpl} from './dao/FileDaoImpl';
import {ObsidianFileAdapter} from './dao/ObsidianFileAdapter';
import {FileAdapter} from './dao/FileAdapter';
import {SettingsServiceImpl} from "./service/SettingsService";
import {SettingsTab} from './utils/SettingsTab';
import {PngConverterService} from './service/PngConverterService';
import {JpgConverterService} from './service/JpgConverterService';
import { JpegConverterService } from './service/JpegConverterService';
import { GeminiAttachmentParserService } from './service/AttachmentParserService';
import { PdfConverterService } from './service/PdfConverterService';

export default class ObsidianIndexer extends Plugin {
	override async onload() {
		// Initialize settings manager and load settings
		const settingsService = new SettingsServiceImpl(this);
		await settingsService.loadSettings();

		// Initialize dependencies
		const fileAdapter: FileAdapter = new ObsidianFileAdapter(this.app);
		const fileDao = new FileDaoImpl(fileAdapter);
		const canvasService = new CanvasService(fileDao, settingsService);
		
		// Create parser instances with specific prompts for each type
		const pdfParser = new GeminiAttachmentParserService(
			settingsService, 
			'application/pdf',
			"Extract and summarize the content of this PDF. Provide the complete text and a brief summary. If the PDF contains images, include descriptions of them and the full text they contain."
		);

		const pngParser = new GeminiAttachmentParserService(
			settingsService, 
			'image/png',
			"Extract and summarize the content of this image. Provide the complete text and a brief summary."
		);

		const jpgParser = new GeminiAttachmentParserService(
			settingsService, 
			'image/jpeg',
			"Extract and summarize the content of this image. Provide the complete text and a brief summary."
		);

		const jpegParser = new GeminiAttachmentParserService(
			settingsService, 
			'image/jpeg',
			"Extract and summarize the content of this image. Provide the complete text and a brief summary."
		);

		// Create converters
		const pdfConverter = new PdfConverterService(fileDao, settingsService.indexFolder, pdfParser);
		const pngConverter = new PngConverterService(fileDao, settingsService.indexFolder, pngParser);
		const jpgConverter = new JpgConverterService(fileDao, settingsService.indexFolder, jpgParser);
		const jpegConverter = new JpegConverterService(fileDao, settingsService.indexFolder, jpegParser);

		// Add settings tab
		this.addSettingTab(new SettingsTab(this.app, this, settingsService));

		// Add command for manual conversion
		this.addCommand({
			id: 'convert-canvas-files',
			name: 'Convert attachment files to Markdown',
			callback: async () => {
				await canvasService.convertFiles();
				await pdfConverter.convertFiles();
				await pngConverter.convertFiles();
				await jpgConverter.convertFiles();
				await jpegConverter.convertFiles();
			},
		});

		// Schedule a second conversion after 2-second delay if runOnStart is enabled
		if (settingsService.runOnStart) {
			window.setTimeout(async () => {
				await canvasService.convertFiles();
				await pdfConverter.convertFiles();
				await pngConverter.convertFiles();
				await jpgConverter.convertFiles();
				await jpegConverter.convertFiles();
			}, 2000);
		}
	}

	override onunload() {
		console.log('Obsidian Indexer plugin unloaded.');
	}
}
