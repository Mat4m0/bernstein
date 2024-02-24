import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, FileSystemAdapter } from 'obsidian';
import startCopyProcess from 'src/copy'
import startProcess from 'src/getNewJson';
import Ahoi from 'src/new';
import path from 'path';
import fs from 'fs';


// Remember to rename these classes and interfaces!

interface BernsteinSettings {
	sitesRepoPath: string;
	sitesObsidianFolder: string;
	vaultDirectory: string;
	vaultName: string;
	vaultPath: string;
}

export const BERNSTEIN_SETTINGS: BernsteinSettings = {
	sitesRepoPath: '/Users/matthias/Git/chilirepo',
	sitesObsidianFolder: '5. Sites',
	vaultDirectory: '',
	vaultName: '',
	vaultPath: '',

}

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

			// Called when the user clicks the icon.
			// await startProcess();
			// startCopyProcess();
			await Ahoi();
			new Notice('This is a notice!!!');
		});
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'open-sample-modal-simple',
			name: 'Open sample modal (simple)',
			callback: () => {
				new SampleModal(this.app).open();
			}
		});
		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'sample-editor-command',
			name: 'Sample editor command',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				console.log(editor.getSelection());
				editor.replaceSelection('Sample Editor Command');
			}
		});
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: 'open-sample-modal-complex',
			name: 'Open sample modal (complex)',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new SampleModal(this.app).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
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
