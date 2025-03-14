import {Plugin} from 'obsidian';
import {CanvasServiceConfig} from "../service/CanvasServiceConfig";
import { AttachmentParserConfig } from './AttachmentParserService';

export interface Settings {
	runOnStart: boolean;
	runOnStartMobile: boolean;
	indexFolder: string;
	googleApiKey: string;
}

export interface SettingsService extends CanvasServiceConfig {
	readonly runOnStart: boolean;
	readonly runOnStartMobile: boolean;
	readonly indexFolder: string;
	readonly googleApiKey: string;
	readonly canvasPostfix: string;
	getApiKey(): string;

	updateRunOnStart(value: boolean): Promise<void>;
	updateRunOnStartMobile(value: boolean): Promise<void>;
	updateIndexFolder(value: string): Promise<void>;
	updateGoogleApiKey(value: string): Promise<void>;
	restoreDefaults(): Promise<void>;
}

export class SettingsServiceImpl implements SettingsService, AttachmentParserConfig {
	private settings: Settings;
	private plugin: Plugin;

	constructor(plugin: Plugin) {
		this.plugin = plugin;
		this.settings = this.getDefaultSettings();
	}

	get canvasPostfix(): string {
		return '.canvas.md';
	}

	get runOnStart(): boolean {
		return this.settings.runOnStart;
	}

	get runOnStartMobile(): boolean {
		return this.settings.runOnStartMobile;
	}

	get indexFolder(): string {
		return this.settings.indexFolder;
	}

	get googleApiKey(): string {
		return this.settings.googleApiKey;
	}

	getApiKey(): string {
		return this.settings.googleApiKey;
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign(
			this.getDefaultSettings(),
			await this.plugin.loadData()
		);
	}

	async updateRunOnStart(value: boolean): Promise<void> {
		this.settings.runOnStart = value;
		await this.saveSettings();
	}

	async updateRunOnStartMobile(value: boolean): Promise<void> {
		this.settings.runOnStartMobile = value;
		await this.saveSettings();
	}

	async updateIndexFolder(value: string): Promise<void> {
		this.settings.indexFolder = value;
		await this.saveSettings();
	}

	async updateGoogleApiKey(value: string): Promise<void> {
		this.settings.googleApiKey = value;
		await this.saveSettings();
	}

	async restoreDefaults(): Promise<void> {
		this.settings = this.getDefaultSettings();
		await this.saveSettings();
	}

	private getDefaultSettings(): Settings {
		return {
			runOnStart: true,
			runOnStartMobile: false, // Default to false for mobile for safety
			indexFolder: 'index',
			googleApiKey: ''
		};
	}

	private async saveSettings(): Promise<void> {
		await this.plugin.saveData(this.settings);
	}
}
