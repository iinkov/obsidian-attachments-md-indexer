import { Plugin, Notice } from 'obsidian';
import { CanvasService } from './service/CanvasService';
import { FileDaoImpl } from './dao/FileDaoImpl';
import { ObsidianFileAdapter } from './dao/ObsidianFileAdapter';
import { FileAdapter } from './dao/FileAdapter';
import { SettingsServiceImpl } from "./service/SettingsService";
import { SettingsTab } from './utils/SettingsTab';
import { PngConverterService } from './service/PngConverterService';
import { JpgConverterService } from './service/JpgConverterService';
import { JpegConverterService } from './service/JpegConverterService';
import { GeminiAttachmentParserService, FatalProcessingError } from './service/AttachmentParserService';
import { PdfConverterService } from './service/PdfConverterService';
import { ConversionStats } from './service/BaseConverterService';
import { Platform } from 'obsidian';

export default class ObsidianIndexer extends Plugin {
	private isConverting = false;

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

		// Migration Logic: Run once for a specific version to rename old index folder
		const runMigration = async () => {
			const currentVersion = this.manifest.version;
			const TARGET_MIGRATION_VERSION = '2.1.4';

			if (currentVersion === TARGET_MIGRATION_VERSION && settingsService.lastMigrationVersion !== TARGET_MIGRATION_VERSION) {
				const oldPath = settingsService.indexFolder;
				const backupPath = `${oldPath} (Backup v2.0.4 - safe to delete)`;

				try {
					// Check if old folder exists
					const folder = this.app.vault.getAbstractFileByPath(oldPath);
					if (folder) {
						console.log(`Migrating index from ${oldPath} to ${backupPath}`);
						await fileAdapter.rename(oldPath, backupPath);

						await settingsService.updateMigrationBackupFolder(backupPath);
						new Notice(`Attachments Index: Old files moved to ${backupPath}. Please delete this backup manually when you are sure you no longer need it.`);
					}

					await settingsService.updateLastMigrationVersion(TARGET_MIGRATION_VERSION);
				} catch (e) {
					console.error('Migration failed:', e);
				}
			}
		};

		// Initialize converters and other services
		const runConversion = async () => {
			if (this.isConverting) {
				new Notice('Conversion is already in progress. Please wait.');
				return;
			}

			this.isConverting = true;
			try {
				// Run converters sequentially and collect stats
				const canvasStats = await canvasService.convertFiles();
				const pdfStats = await pdfConverter.convertFiles();
				const pngStats = await pngConverter.convertFiles();
				const jpgStats = await jpgConverter.convertFiles();
				const jpegStats = await jpegConverter.convertFiles();

				// Sum images for cleaner summary
				const imageStats = {
					created: pngStats.createdCount + jpgStats.createdCount + jpegStats.createdCount,
					modified: pngStats.modifiedCount + jpgStats.modifiedCount + jpegStats.modifiedCount,
					removed: pngStats.removedCount + jpgStats.removedCount + jpegStats.removedCount,
				};

				// Create summary message
				let summary = '✅ Indexing Finished\n';

				if (canvasStats.createdCount > 0 || canvasStats.modifiedCount > 0) {
					summary += `• Canvas: ${canvasStats.createdCount} new, ${canvasStats.modifiedCount} updated\n`;
				}
				if (pdfStats.createdCount > 0 || pdfStats.modifiedCount > 0) {
					summary += `• PDF: ${pdfStats.createdCount} new, ${pdfStats.modifiedCount} updated\n`;
				}
				if (imageStats.created > 0 || imageStats.modified > 0) {
					summary += `• Image: ${imageStats.created} new, ${imageStats.modified} updated\n`;
				}

				const totalProcessed = canvasStats.createdCount + canvasStats.modifiedCount + pdfStats.createdCount + pdfStats.modifiedCount + imageStats.created + imageStats.modified;

				if (totalProcessed === 0) {
					summary = '✅ Indexing Finished: Everything is up-to-date.';
				} else {
					summary += `\nTotal processed: ${totalProcessed} files.`;
				}

				new Notice(summary, 5000);
			} catch (error) {
				if (error instanceof FatalProcessingError) {
					// Show specific error message (e.g., highlighting reset time)
					new Notice(error.message);
					console.error('Conversion process stopped:', error.message);
				} else {
					// Handle other errors
					new Notice('An error occurred during processing');
					console.error('Conversion error:', error);
				}
			} finally {
				this.isConverting = false;
			}
		};

		// Add settings tab
		this.addSettingTab(new SettingsTab(this.app, this, settingsService));

		// Add command for manual conversion
		this.addCommand({
			id: 'convert-canvas-files',
			name: 'Convert attachment files to Markdown',
			callback: async () => {
				await runConversion();
			},
		});

		// Schedule a delayed conversion if runOnStart is enabled
		const shouldAutoStart = Platform.isMobile
			? settingsService.runOnStartMobile
			: settingsService.runOnStart;

		// Make sure vault is fully loaded before doing any file operations
		this.app.workspace.onLayoutReady(async () => {
			// Run migration check first
			await runMigration();

			// Then run conversion if auto-start is enabled
			if (shouldAutoStart) {
				runConversion();
			}
		});

		// Background watcher: Every 60 minutes, attempt conversion again.
		// If 24h limit is still active, it will simply silently pause again.
		this.registerInterval(
			window.setInterval(() => runConversion(), 60 * 60 * 1000)
		);
	}

	override onunload() {
		console.log('Obsidian Indexer plugin unloaded.');
	}
}
