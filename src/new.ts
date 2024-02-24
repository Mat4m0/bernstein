import { BERNSTEIN_SETTINGS } from '../main';
import { promises as fsPromises } from 'fs';
import path from 'path';
import matter from 'gray-matter';

export default async function Ahoi() {
    const sitesObsidianPath = path.join(BERNSTEIN_SETTINGS.vaultPath, BERNSTEIN_SETTINGS.sitesObsidianFolder);

    const sites = await fsPromises.readdir(sitesObsidianPath, {});

    for (const site of sites) {
        const sitePath = path.join(sitesObsidianPath, site);
        const siteInstance = new Site(sitePath); 
        await siteInstance.checkForMetaData(); 
		await siteInstance.createCanvasObject();
    }
}

class Site {
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

        console.log(this.metaData);
    }

	async createCanvasObject(): Promise<void> {
        if (this.metaData === null) {
            console.log('No metaData found');
            return;
        }

		for (const entry of this.metaData.entry) {
            let fullPath: string;
            let canvasInstance: Canvas;

            if (entry.includes("/")) {
                fullPath = path.join(BERNSTEIN_SETTINGS.vaultPath, entry);
                canvasInstance = new Canvas(fullPath, this.metaData.target, this.metaData.domain, true);
            } else {
                fullPath = path.join(this.path, entry);
                canvasInstance = new Canvas(fullPath, this.metaData.target, this.metaData.domain, false);
            }

            // For demonstration purposes, displaying the info of the created instance
            canvasInstance.displayInfo();
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


class Canvas {
    path: string;
    target: string;
    domain: string;
    isMultiInstance: boolean;

    constructor(path: string, target: string, domain: string, isMultiInstance: boolean) {
        this.path = path;
        this.target = target;
        this.domain = domain;
        this.isMultiInstance = isMultiInstance;
    }

    // Example method to illustrate functionality
    displayInfo() {
        console.log(`Path: ${this.path}, Target: ${this.target}, Domain: ${this.domain}, Is Multi Instance: ${this.isMultiInstance}`);
    }
}

interface SiteMetaData {
    target: string;
    domain: string;
	entry: string[];
	entryMulti: string[] ;
}
