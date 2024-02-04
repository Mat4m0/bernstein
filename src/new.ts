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
	// Note: Handling of async creation and initialization of Canvas instances may need adjustment
	new Canvas('/Users/matthias/Git/_Loopinum/bernstein/Bernstein Vault/', '5. DOCS/BEESPACE/Entry.canvas', false, "");
  }
  

class Canvas implements CanvasType {
  vaultPath: string;
  canvasPath: string;
  isSubCanvas: boolean;
  canvasData: CanvasData;
  canvasName: string;
  nodeId: string;

  constructor(vaultPath: string, canvasPath: string, isSubCanvas: boolean, nodeId: string) {
    this.canvasPath = canvasPath;
    this.vaultPath = vaultPath;
    this.isSubCanvas = isSubCanvas;
    this.canvasData = {} as CanvasData;
	this.canvasName = canvasPath.split("/").pop() as string
	this.nodeId = nodeId
    // Since constructors can't be async, move async initialization to a separate method
    this.initializeCanvas();
  }

  async initializeCanvas() {
    try {
      await this.readFile();
      this.checkForSubCanvas();
      this.subCanvasProcessing();
	  this.aggregateData();
    } catch (error) {
      console.error('Failed to initialize canvas:', error);
    }
  }

  async readFile() {
    try {
      const canvasFile = await fs.readFile(path.join(this.vaultPath, this.canvasPath), 'utf8');
      this.canvasData = JSON.parse(canvasFile);
    } catch (error) {
      console.error('Error reading canvas file:', error);
      throw error; // Rethrow to allow the caller to handle it
    }
  }

	checkForSubCanvas() {
		this.canvasData.nodes
			.filter((node: AllCanvasNodeData) => node.type === 'file' && node.file && node.file.endsWith('.canvas'))
			.forEach((subCanvasNode: CanvasFileData) => {
				const subCanvas: CanvasType = new Canvas(this.vaultPath, subCanvasNode.file, true, subCanvasNode.id);
			})
	}

	subCanvasProcessing() {
		if (this.isSubCanvas == true) {
			addNewGroup(this.canvasData, this.canvasName, this.nodeId)

		}
	}

	aggregateData() {
		
	}

	
}



function addNewGroup(canvasData: CanvasData, canvasName: string, nodeId: string) {
    // Generate a UUID for the new group
    const newGroupId = generateCustomId();

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

function generateCustomId(length: number = 16): string {
    let uuid = uuidv4().replace(/-/g, ''); // Remove hyphens
    return uuid.substring(0, length); // Truncate to the desired length
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






