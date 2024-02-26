import * as fs from 'fs/promises';

export class MarkdownFile {
	filePath: string;
	assets: string[];
	fileContent: string;
	combinedAssets: string[];
	conversionStrategy: MarkdownConversionStrategy;

	constructor(filePath: string, combinedAssets: string[], conversionStrategy: MarkdownConversionStrategy) {
		this.filePath = filePath;
		this.assets = [];
		this.fileContent = '';
		this.combinedAssets = combinedAssets;
		this.conversionStrategy = conversionStrategy;
	}

	async initialize(): Promise<void> {
		await this.readMarkdownFile();
		await this.findAssetsInContent();
		await this.addAssetsToCombinedAssets();
		await this.convertMarkdown();
	}

	async readMarkdownFile() {
		try {
			this.fileContent = await fs.readFile(this.filePath, 'utf8');
		} catch (error) {
			console.error('Error reading markdown file:', error);
			throw error;
		}
	}

	async convertMarkdown() {
		this.fileContent = await this.conversionStrategy.convert(this.fileContent);
	}

	async addAssetsToCombinedAssets() {
		this.combinedAssets.push(...this.assets);
	}

	async findAssetsInContent(): Promise<void> {
		const assetRegex = /!\[\[(.*?)\]\]/g;
		let match;
		while ((match = assetRegex.exec(this.fileContent)) !== null) {
			this.assets.push(match[1]);
		}
	}
}

interface MarkdownConversionStrategy {
	convert(markdownContent: string): Promise<string>;
}

export class NuxtDocsConversionStrategy implements MarkdownConversionStrategy {
	async convert(markdownContent: string): Promise<string> {

		let convertedContent = await this.convertCallouts(markdownContent);
		convertedContent = await this.convertLinks(convertedContent);
		convertedContent = await this.convertImages(convertedContent);
		convertedContent = await this.convertAssets(convertedContent);
		return convertedContent;
	}

	private async convertCallouts(markdownContent: string): Promise<string> {
		// Conversion logic for callouts
		return markdownContent; // Placeholder for actual implementation
	}

	private async convertLinks(markdownContent: string): Promise<string> {
		// Conversion logic for links
		return markdownContent; // Placeholder for actual implementation
	}

	private async convertImages(markdownContent: string): Promise<string> {
		// Conversion logic for images
		return markdownContent; // Placeholder for actual implementation
	}

	private async convertAssets(markdownContent: string): Promise<string> {
		// Conversion logic for assets
		return markdownContent; // Placeholder for actual implementation
	}
}




// class DocusaurusConversionStrategy implements MarkdownConversionStrategy {
// 	convert(markdownContent: string): string {
// 		// No conversion, return original
// 		return markdownContent;
// 	}
// }












