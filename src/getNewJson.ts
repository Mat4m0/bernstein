// Readin Canvas
import * as fs from 'fs/promises'; // Import the promises API for fs
import * as path from 'path';
import { CanvasData, AllCanvasNodeData, CanvasFileData, CanvasGroupData, CanvasNodeData } from 'canvas';
import { v4 as uuidv4 } from 'uuid';

interface CanvasType {
	path: string;
	isSubCanvas: boolean;
	canvasData: CanvasData;
	canvasName: string;
	readFile: () => Promise<void>; // Update type signature to return a Promise
}

export default async function startProcess() {
	const combinedData: CanvasData = { nodes: [], edges: [] }
	const entryCanvas = new Canvas('/Users/matthias/Git/_Loopinum/bernstein/Bernstein Vault/', 'ingravity/canvas.canvas', false, "", combinedData);
	await entryCanvas.initializeCanvas()
	console.log(combinedData)
	combinedData.nodes = await removeSubCanvase(combinedData.nodes)
	await cleanupChildren(combinedData.nodes)
	const outputFilePath = '/Users/matthias/Git/_Loopinum/bernstein/combinedData.json'; // Specify the output file path
	await writeCombinedDataToDisk(combinedData, outputFilePath);
}


class Canvas implements CanvasType {
	vaultPath: string;
	canvasPath: string;
	isSubCanvas: boolean;
	canvasData: CanvasData;
	canvasName: string;
	nodeId: string;
	combinedData: CanvasData;

	constructor(vaultPath: string, canvasPath: string, isSubCanvas: boolean, nodeId: string, combinedData: CanvasData) {
		this.canvasPath = canvasPath;
		this.vaultPath = vaultPath;
		this.isSubCanvas = isSubCanvas;
		this.canvasData = {} as CanvasData;
		this.canvasName = canvasPath.split("/").pop() as string
		this.nodeId = nodeId
		this.combinedData = combinedData;
	}

	async initializeCanvas() {
		try {
			await this.readFile();
			await this.checkForSubCanvas();
			await this.subCanvasProcessing();
			this.aggregateData();
		} catch (error) {
			console.error('Failed to initialize canvas:', error);
		}
	}

	async readFile() {
		try {
			const canvasFile = await fs.readFile(path.join(this.vaultPath, this.canvasPath), 'utf8');
			this.canvasData = JSON.parse(canvasFile);
			addChildrenToGroups(this.canvasData.nodes)
		} catch (error) {
			console.error('Error reading canvas file:', error);
			throw error; // Rethrow to allow the caller to handle it
		}
	}

	async checkForSubCanvas() {
		await Promise.all(
			this.canvasData.nodes
				.filter((node: AllCanvasNodeData) => node.type === 'file' && node.file && node.file.endsWith('.canvas'))
				.map(async (subCanvasNode: CanvasFileData) => {
					const subCanvas: CanvasType = new Canvas(this.vaultPath, subCanvasNode.file, true, subCanvasNode.id, this.combinedData);
					await subCanvas.initializeCanvas();
				})
		);
	}

	async subCanvasProcessing() {
		if (this.isSubCanvas == true) {
			addNewGroup(this.canvasData, this.canvasName, this.nodeId)

		}
	}

	aggregateData() {
		this.combinedData.nodes.push(...this.canvasData.nodes);
		this.combinedData.edges.push(...this.canvasData.edges);
	}

}

async function cleanupChildren(groups: AllCanvasNodeData[]) {
    groups.forEach((groupA) => {
      const removeIds: Set<string> = new Set();
      groupA.children.forEach((childId) => {
        const childNode = groups.find((groupB) => groupB.id === childId);
        if (childNode) {
          childNode.children.forEach((grandChildId) => {
            removeIds.add(grandChildId);
          });
        }
      });
      groupA.children = groupA.children.filter((childId: string) => !removeIds.has(childId));
    });
  }


async function removeSubCanvase(combinedData: AllCanvasNodeData[]) {
	return combinedData.filter((node) => !(node.type == 'file' && node.file.endsWith(".canvas")))


}


function addNewGroup(canvasData: CanvasData, canvasName: string, nodeId: string) {
	// Generate a UUID for the new group

	// Get all node IDs to add as children to the new group
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

async function writeCombinedDataToDisk(combinedData: CanvasData, outputFilePath: string): Promise<void> {
	try {
		// Convert combinedData to JSON format
		const combinedDataJSON = JSON.stringify(combinedData, null, 2); // Use null and 2 for pretty formatting

		// Write the JSON data to the file
		await fs.writeFile(outputFilePath, combinedDataJSON, 'utf8');
		console.log(`Combined data has been written to ${outputFilePath}`);
	} catch (error) {
		console.error('Error writing combinedData to disk:', error);
		throw error; // Rethrow the error to handle it externally if needed
	}
}




