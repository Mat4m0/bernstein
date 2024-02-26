import { App, FileSystemAdapter, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile } from 'obsidian';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import path from 'path';

import { Site } from 'src/siteProcessor';


// Remember to rename these classes and interfaces!

interface BernsteinSettings {
	sitesRepoPath: string;
	sitesObsidianFolder: string;
	vaultDirectory: string;
	vaultName: string;
	vaultPath: string;
}

export const BERNSTEIN_SETTINGS: BernsteinSettings = {
	sitesRepoPath: '/Users/matthias/Git/',
	sitesObsidianFolder: '5. Sites',
	vaultDirectory: '',
	vaultName: '',
	vaultPath: '',

}

export let ALLFILES: TFile[] = []

export default class MyPlugin extends Plugin {
	settings: BernsteinSettings;

	async onload() {
		await this.loadSettings();

		if (this.app.vault.adapter instanceof FileSystemAdapter) {
			// Correctly update the vaultPath property of BERNSTEIN_SETTINGS
			BERNSTEIN_SETTINGS.vaultDirectory = path.dirname(this.app.vault.adapter.getBasePath());
		}


		const vaultName = await searchForVaultName(BERNSTEIN_SETTINGS.vaultDirectory);
		if (typeof vaultName === 'string') {
			BERNSTEIN_SETTINGS.vaultName = vaultName;
		} else {
			// Handle the undefined case, for example, by setting a default name or showing an error.
			console.error('Vault name could not be determined.');
			BERNSTEIN_SETTINGS.vaultName = 'DefaultVaultName'; // Set a default name or handle appropriately.
		}

		BERNSTEIN_SETTINGS.vaultPath = path.join(BERNSTEIN_SETTINGS.vaultDirectory, BERNSTEIN_SETTINGS.vaultName);

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('dice', 'Sample Plugin', async (evt: MouseEvent) => {

			ALLFILES = this.app.vault.getFiles()

			const sitesObsidianPath = path.join(BERNSTEIN_SETTINGS.vaultPath, BERNSTEIN_SETTINGS.sitesObsidianFolder);

			const sites = await fsPromises.readdir(sitesObsidianPath, {});

			for (const site of sites) {
				const sitePath = path.join(sitesObsidianPath, site);
				const siteInstance = new Site(sitePath);
				await siteInstance.checkForMetaData();
				await siteInstance.createCanvasObject();
			}
			new Notice('Bernstein Plugin: Run Sucessfull');
		});
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');


	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, BERNSTEIN_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Setting #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.sitesRepoPath)
				.onChange(async (value) => {
					this.plugin.settings.sitesRepoPath = value;
					await this.plugin.saveSettings();
				}));
	}
}



export async function searchForVaultName(searchPath: string): Promise<string | undefined> {
	try {
		const folders = await fs.promises.readdir(searchPath, { withFileTypes: true });
		for (const folder of folders) {
			if (folder.isDirectory()) {
				const potentialObsidianPath = path.join(searchPath, folder.name, '.obsidian');
				try {
					await fs.promises.access(potentialObsidianPath);
					// .obsidian folder found, return the parent folder's name
					return folder.name;
				} catch (error: any) { // Explicitly marking error as any for clarity; consider more specific typing if applicable.
					// .obsidian folder not found in this directory, ignore error
				}
			}
		}
	} catch (error: any) { // Similarly, marking error as any; can be typed more specifically based on expected errors.
		console.error('Error searching for vault name:', error);
	}
	// Log a clear message if the .obsidian folder was not found in any subdirectories.
	console.log('No .obsidian folder found in', searchPath);
	return undefined;
}


