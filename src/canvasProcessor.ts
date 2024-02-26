import path from 'path';
import * as fs from 'fs/promises';

import { BERNSTEIN_SETTINGS, ALLFILES } from '../main';
import { NuxtDocsConversionStrategy, MarkdownFile } from './markdownProcessor';


import { CanvasData, AllCanvasNodeData, CanvasFileData, CanvasGroupData } from 'canvas';

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

export class EntryCanvas extends Canvas {
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
				const markdownConverter = new NuxtDocsConversionStrategy();
				const markdownFile = new MarkdownFile(sourcePath, combinedAssets, markdownConverter);
				await markdownFile.initialize(); // Ensure initialize() is awaited
				console.log(markdownFile.fileContent)
			}
		}

		combinedAssets = [...new Set(combinedAssets)];
		const assetsPaths = await this.searchForAsset(combinedAssets)
		console.log(assetsPaths)

	}

	async searchForAsset(combinedAssets: string[]) {
		// Search for each Asset in ALLFILES create an Array with the paths

		const assetsPaths: string[] = []
		for (const asset of combinedAssets) {
			const assetPath = ALLFILES.find((file) => file.path.endsWith(asset));
			if (assetPath) {
				assetsPaths.push(assetPath.path)
			}
		}
		return assetsPaths
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
