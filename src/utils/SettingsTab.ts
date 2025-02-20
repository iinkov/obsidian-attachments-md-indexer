import {App, Plugin, PluginSettingTab, Setting} from 'obsidian';
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
			.setName('Canvas postfix')
			.setDesc('File extension for converted Canvas files (must end with ".md" and be at least 5 chars long). Example: ".canvas.md".  If you change this, you need to manually delete old converted files and re-run the conversion.')
			.addText(text => text
				.setPlaceholder('.canvas.md')
				.setValue(this.settingsService.canvasPostfix)
				.onChange(async (value) => {
					if (!value.endsWith('.md') || value.length < 5) {
						value = '.canvas.md';
					}
					await this.settingsService.updateCanvasPostfix(value);
				}));

		new Setting(containerEl)
			.setName('Run on start')
			.setDesc('Automatically convert Canvas files when plugin loads')
			.addToggle(toggle => toggle
				.setValue(this.settingsService.runOnStart)
				.onChange(async (value) => {
					await this.settingsService.updateRunOnStart(value);
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
