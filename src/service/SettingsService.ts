import {Plugin} from 'obsidian';
import {CanvasServiceConfig} from "../service/CanvasServiceConfig";
import { ImageParserConfig } from './ImageParserService';

export interface Settings {
	canvasPostfix: string;
	runOnStart: boolean;
	indexFolder: string;
	googleApiKey: string;
}

export interface SettingsService extends CanvasServiceConfig {
	readonly canvasPostfix: string;
	readonly runOnStart: boolean;
	readonly indexFolder: string;
	readonly googleApiKey: string;
	getApiKey(): string;

	updateCanvasPostfix(value: string): Promise<void>;

	updateRunOnStart(value: boolean): Promise<void>;

	updateIndexFolder(value: string): Promise<void>;

	updateGoogleApiKey(value: string): Promise<void>;

	restoreDefaults(): Promise<void>;
}

export class SettingsServiceImpl implements SettingsService, ImageParserConfig {
	private settings: Settings;
	private plugin: Plugin;

	constructor(plugin: Plugin) {
		this.plugin = plugin;
		this.settings = this.getDefaultSettings();
	}

	get canvasPostfix(): string {
		return this.settings.canvasPostfix;
	}

	get runOnStart(): boolean {
		return this.settings.runOnStart;
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

	async updateCanvasPostfix(value: string): Promise<void> {
		this.settings.canvasPostfix = value;
		await this.saveSettings();
	}

	async updateRunOnStart(value: boolean): Promise<void> {
		this.settings.runOnStart = value;
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
			canvasPostfix: '.canvas.md',
			runOnStart: true,
			indexFolder: 'index',
			googleApiKey: ''
		};
	}

	private async saveSettings(): Promise<void> {
		await this.plugin.saveData(this.settings);
	}
}
