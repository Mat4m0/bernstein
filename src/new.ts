import { BERNSTEIN_SETTINGS } from '../main';
import { promises as fsPromises } from 'fs';
import path from 'path';
import matter from 'gray-matter';
import * as fs from 'fs/promises';

import { uniq } from 'lodash'

import { CanvasData, AllCanvasNodeData, CanvasFileData, CanvasGroupData } from 'canvas';

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

interface SiteMetaData {
	target: string;
	domain: string;
	entry: string[];
	entryMulti: string[];
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

class Canvas {
	canvasPath: string;
	canvasData: CanvasData;
	canvasName: string;

	constructor(canvasPath: string) {
		this.canvasPath = canvasPath;
		this.canvasData = { nodes: [], edges: [] };
		this.canvasName = canvasPath.split("/").pop() as string
	}

	async readCanvasFile(): Promise<void> {
		try {
			const canvasFile = await fs.readFile(this.canvasPath, 'utf8');
			this.canvasData = JSON.parse(canvasFile);
			addChildrenToGroups(this.canvasData.nodes)
		} catch (error) {
			console.error('Error reading canvas file:', error);
			throw error;
		}
	}

	async checkForSubCanvas(parentCanvasData: CanvasData): Promise<void> {
		await Promise.all(
			this.canvasData.nodes
				.filter((node: AllCanvasNodeData) => node.type === 'file' && node.file && node.file.endsWith('.canvas'))
				.map(async (subCanvasNode: CanvasFileData) => {
					const subCanvas = new SubCanvas(path.join(BERNSTEIN_SETTINGS.vaultPath, subCanvasNode.file), parentCanvasData, subCanvasNode.id);
					await subCanvas.initialize();
				})
		);
	}
}

class EntryCanvas extends Canvas {
	target: string;
	domain: string;
	isMultiInstance: boolean;
	combinedData: CanvasData;
	constructor(canvasPath: string, target: string, domain: string, isMultiInstance: boolean) {
		super(canvasPath);
		this.target = target;
		this.domain = domain;
		this.isMultiInstance = isMultiInstance;
		this.combinedData = { nodes: [], edges: [] };
	}

	async initialize(): Promise<void> {
		await this.readCanvasFile();
		// Directly combine the read data with the combinedData state
		this.combineCanvasData(this.canvasData);

		await this.checkForSubCanvas(this.combinedData);
		//console.log(this.combinedData);
	}

	combineCanvasData(sourceCanvasData: CanvasData): void {
		this.combinedData.nodes = [...this.combinedData.nodes, ...sourceCanvasData.nodes];
		this.combinedData.edges = [...this.combinedData.edges, ...sourceCanvasData.edges];
	}

	async writeCombinedDataToDisk(outputFilePath: string): void {
		// Convert combinedData to JSON format
		this.combinedData.nodes = await removeSubCanvase(this.combinedData.nodes);
		await cleanupChildren(this.combinedData.nodes);
		const combinedDataJSON = JSON.stringify(this.combinedData, null, 2); // Use null and 2 for pretty formatting

		// Write the JSON data to the file
		fs.writeFile(outputFilePath, combinedDataJSON, 'utf8')
			.then(() => console.log(`Combined data has been written to ${outputFilePath}`))
			.catch((error) => console.error('Error writing combinedData to disk:', error));
	}

	async copyToWebsite(): Promise<void> {

		this.combinedData.nodes = await removeSubCanvase(this.combinedData.nodes);
		await cleanupChildren(this.combinedData.nodes);

		this.writeCombinedDataToDisk(BERNSTEIN_SETTINGS.vaultDirectory + "/" + this.canvasName.split(".")[0] + ".json")

		const groups = this.combinedData.nodes.filter((node) => node.type === 'group') as CanvasGroupData[]

		let combinedAssets: string[] = []
	
		// Process each group sequentially
		for (const group of groups) {
			// Await the processing of each child within the group
			for (const child of group.children) {
				const node = this.combinedData.nodes.find((n) => n.id === child) as CanvasFileData;
				if (!node || node.type !== 'file' || !node.file.endsWith(".md")) continue; // Skip if not a file node
	
				const sourcePath = path.join(BERNSTEIN_SETTINGS.vaultPath, node.file);
				console.log(sourcePath)				
				const markdownFile = new MarkdownFile(sourcePath, combinedAssets);
				await markdownFile.initialize(); // Ensure initialize() is awaited
				// Additional processing...
			}
		}
		console.log(combinedAssets)

		const combinedAssetsx = [...new Set(combinedAssets)];

		console.log(combinedAssetsx)
	}

}


async function searchForAsset() {
return
}

class MarkdownFile {
	filePath: string;
	assets: string[];
	fileContent: string;
	combinedAssets: string[];

	constructor(filePath: string, combinedAssets: string[]) {
		this.filePath = filePath;
		this.assets = [];
		this.fileContent = '';
		this.combinedAssets = combinedAssets;
	}

	async initialize(): Promise<void> {
		await this.readMarkdownFile();
		await this.findAssetsInContent();
		await this.addAssetsToCombinedAssets();
	}

	async readMarkdownFile() {
		try {
			this.fileContent = await fs.readFile(this.filePath, 'utf8');
		} catch (error) {
			console.error('Error reading markdown file:', error);
			throw error;
		}
	}

	async addAssetsToCombinedAssets() {
		console.log(this.combinedAssets)
		this.combinedAssets.push(...this.assets);
	}

	async findAssetsInContent(): Promise<void> {
		const assetRegex = /!\[\[(.*?)\]\]/g;
		let match;
		while ((match = assetRegex.exec(this.fileContent)) !== null) {
			console.log(match[1]);
			this.assets.push(match[1]);
		}
	}
}

class SubCanvas extends Canvas {
	nodeId: string;

	constructor(canvasPath: string, private parentCanvasData: CanvasData, parentNodeId: string) {
		super(canvasPath);
		this.nodeId = parentNodeId
	}

	async initialize(): Promise<void> {
		await this.readCanvasFile();
		await this.subCanvasProcessing();
		// Combine this SubCanvas's data with its parent's data
		this.parentCanvasData.nodes = [...this.parentCanvasData.nodes, ...this.canvasData.nodes];
		this.parentCanvasData.edges = [...this.parentCanvasData.edges, ...this.canvasData.edges];
		await this.checkForSubCanvas(this.parentCanvasData); // This will propagate the combined data up the chain

	}
	async subCanvasProcessing() {
		addNewGroup(this.canvasData, this.canvasName, this.nodeId)
	}
}


// makes sure that each element has only 1 parent above it
async function cleanupChildren(nodes: AllCanvasNodeData[]) {
	nodes.forEach((groupA) => {
		const removeIds: Set<string> = new Set();
		groupA.children.forEach((childId) => {
			const childNode = nodes.find((groupB) => groupB.id === childId);
			if (childNode) {
				childNode.children.forEach((grandChildId) => {
					removeIds.add(grandChildId);
				});
			}
		});
		groupA.children = groupA.children.filter((childId: string) => !removeIds.has(childId));
	});
	return nodes;


}
async function removeDuplicates(assets: string[]): string[] {
	const uniqueAssets = asset

	return uniqueAssets;
}

function addNewGroup(canvasData: CanvasData, canvasName: string, nodeId: string) {
	const allNodeIds = canvasData.nodes.map((node) => node.id);

	// Create a new group node with all existing node IDs as children
	const newGroup: CanvasGroupData = {
		id: nodeId,
		x: 0,
		y: 0,
		width: 0,
		height: 0,
		type: 'group',
		label: canvasName,
		children: allNodeIds,
	};

	canvasData.nodes.push(newGroup);
}

function isContainedIn(groupA: AllCanvasNodeData, groupB: AllCanvasNodeData): boolean {
	return (
		groupA.x >= groupB.x &&
		groupA.y >= groupB.y &&
		groupA.x + groupA.width <= groupB.x + groupB.width &&
		groupA.y + groupA.height <= groupB.y + groupB.height
	);
}


function addChildrenToGroups(groups: AllCanvasNodeData[]): void {
	groups.forEach((groupA) => {
		// Skip processing for groups with x, y, width, and height set to zero
		if (groupA.x === 0 && groupA.y === 0 && groupA.width === 0 && groupA.height === 0) {
			//console.log(`Skipping group ${groupA.id} due to zero dimensions and position.`);
			return; // Skip further processing for this group
		}

		groupA.children = groups
			.filter((groupB) => groupB.id !== groupA.id && isContainedIn(groupB, groupA))
			.map((groupB) => groupB.id);
	});
}



async function removeSubCanvase(combinedDataNodes: AllCanvasNodeData[]) {
	return combinedDataNodes.filter((node) => !(node.type == 'file' && node.file.endsWith(".canvas")))
}



