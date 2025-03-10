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
			.setDesc('API key for Google Gemini Vision API to extract text from images')
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
