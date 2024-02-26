import { promises as fsPromises } from 'fs';
import path from 'path';
import matter from 'gray-matter';

import { EntryCanvas } from './canvasProcessor';
import { BERNSTEIN_SETTINGS } from '../main';

interface SiteMetaData {
	target: string;
	domain: string;
	entry: string[];
	entryMulti: string[];
}

export class Site {
	path: string;
	metaData: SiteMetaData | null = null;

	constructor(sitePath: string) {
		this.path = sitePath;
	}

	async checkForMetaData(): Promise<void> {
		const metaFilePath = path.join(this.path, '__meta.md');
		try {
			await fsPromises.access(metaFilePath);
			await this.loadMetaData(metaFilePath);
		} catch (error) {
			console.log(`No __meta.md file found in ${this.path}`);
		}
	}

	async loadMetaData(metaFilePath: string): Promise<void> {
		const fileContent = await fsPromises.readFile(metaFilePath, 'utf8');
		const parsedContent = matter(fileContent).data;

		// Initialize metaData with known properties and ensure arrays for entry and entry-multi
		const metaData: SiteMetaData = {
			target: parsedContent.target,
			domain: parsedContent.domain,
			entry: this.processEntries(parsedContent.entry || []),
			entryMulti: this.processEntries(parsedContent['entry-multi'] || [])
		};

		this.metaData = metaData;

		//console.log(this.metaData);
	}

	async createCanvasObject(): Promise<void> {
		if (this.metaData === null) {
			console.log('No metaData found');
			return;
		}

		// Combine entry and entryMulti, tagging entryMulti items as multi-instance
		const combinedEntries = [
			...this.metaData.entry.map(entry => ({ entry, isMulti: false })),
			...this.metaData.entryMulti.map(entry => ({ entry, isMulti: true }))
		];

		for (const { entry, isMulti } of combinedEntries) {
			let fullPath: string;
			if (entry.includes("/")) {
				fullPath = path.join(BERNSTEIN_SETTINGS.vaultPath, entry);
			} else {
				fullPath = path.join(this.path, entry);
			}

			const entryCanvas = new EntryCanvas(fullPath, this.metaData.target, this.metaData.domain, isMulti);
			await entryCanvas.initialize();
			//await entryCanvas.writeCombinedDataToDisk(BERNSTEIN_SETTINGS.vaultDirectory + "/" + entryCanvas.canvasName.split(".")[0] + ".json");
			entryCanvas.copyToWebsite();
			//console.log(entryCanvas.combinedData);

		}
	}

	processEntries(entries: string[]): string[] {
		const processedEntries = entries.map(entry => {
			const match = entry.match(/\[\[(.*?)\|/); // Matches the content before the "|"
			return match ? match[1] : entry; // Returns matched substring or original if no match
		});
		return processedEntries;
	}
}
