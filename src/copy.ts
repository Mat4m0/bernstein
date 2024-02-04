import * as fs from 'fs/promises'; // Import the promises API for fs
import * as path from 'path';
import { CanvasData, AllCanvasNodeData, CanvasFileData, CanvasGroupData, CanvasNodeData } from 'canvas';


export default async function startCopyProcess() {
	const canvasData: CanvasData = await readJson('/Users/matthias/Git/_Loopinum/bernstein/combinedData.json')
	console.log(canvasData)

	// Okay i have now the data what now?

	// check for cyan colored 
}

async function readJson(path: string): Promise<CanvasData> {
	try {
		const canvasFile = await fs.readFile((path), 'utf8');
		return JSON.parse(canvasFile);
	} catch (error) {
		console.error('Error reading canvas file:', error);
		throw error; // Rethrow to allow the caller to handle it
	}
}
