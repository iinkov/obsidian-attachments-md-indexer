import {App, Platform, Plugin, PluginSettingTab, Setting} from 'obsidian';
import {SettingsService} from "../service/SettingsService";

export class SettingsTab extends PluginSettingTab {
	private settingsService: SettingsService;

	constructor(app: App, plugin: Plugin, settingsService: SettingsService) {
		super(app, plugin);
		this.settingsService = settingsService;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		// Add comprehensive plugin description at the top
		const descriptionEl = containerEl.createEl('div', { cls: 'plugin-description' });
		
		descriptionEl.createEl('h2', { text: 'How This Plugin Works' });
		
		const mainDescription = descriptionEl.createEl('p');
		mainDescription.innerHTML = `This plugin creates searchable markdown index files for various attachment types in your vault:
		<ul>
			<li><strong>Canvas files</strong> (.canvas): Converts canvas JSON into markdown format with links to nodes and groups</li>
			<li><strong>PDF files</strong> (.pdf): Creates markdown files with PDF viewer and extracted content (requires Google API key)</li>
			<li><strong>Image files</strong> (.png, .jpg, .jpeg): Creates markdown files with embedded images and extracted text content (requires Google API key)</li>
		</ul>
		All indexed files are stored in the specified index folder with their original extension plus ".md" (e.g., file.canvas → index/file.canvas.md).`;

		new Setting(containerEl)
			.setName('Run on start')
			.setDesc('Automatically convert files when plugin loads')
			.addToggle(toggle => toggle
				.setValue(this.settingsService.runOnStart)
				.onChange(async (value) => {
					await this.settingsService.updateRunOnStart(value);
				}));

		new Setting(containerEl)
			.setName('Run on start (Mobile)')
			.setDesc('Automatically convert files when plugin loads on mobile devices. Separate from desktop setting to help prevent crashes. It is recommended to enable this only after initial indexation is complete, as the process could take up to several days for large vaults and might cause Obsidian to restart if big files are present.')
			.addToggle(toggle => toggle
				.setValue(this.settingsService.runOnStartMobile)
				.onChange(async (value) => {
					await this.settingsService.updateRunOnStartMobile(value);
				}));

		new Setting(containerEl)
			.setName('Index folder')
			.setDesc('Folder to store converted files (must be at least 3 chars). If you change this, you need to manually rename or delete the old folder and re-run the conversion.')
			.addText(text => text
				.setPlaceholder('index')
				.setValue(this.settingsService.indexFolder)
				.onChange(async (value) => {
					if (value.length < 3) {
						value = 'index';
					}
					await this.settingsService.updateIndexFolder(value);
				}));

		new Setting(containerEl)
			.setName('Google API Key')
			.setDesc('Without this key, only Canvas files will be indexed. While Gemini has daily limits, they are usually sufficient for free usage. PDFs and images will be indexed gradually over several hours. Get your key here: https://aistudio.google.com/app/apikey')
			.addText(text => {
				text.inputEl.type = 'password';
				text.setPlaceholder('Enter your Google API key')
					.setValue(this.settingsService.googleApiKey)
					.onChange(async (value) => {
						await this.settingsService.updateGoogleApiKey(value);
					});
			});

		// Add Restore Defaults button
		new Setting(containerEl)
			.setName('Restore default settings')
			.setDesc('Reset all settings to their default values')
			.addButton(button => button
				.setButtonText('Restore defaults')
				.onClick(async () => {
					await this.settingsService.restoreDefaults();
					this.display(); // Refresh the settings UI
				}));
	}
}
