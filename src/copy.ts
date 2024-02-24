import * as fs from 'fs/promises'; // Import the promises API for fs
import * as path from 'path';
import { CanvasData, AllCanvasNodeData, CanvasFileData, CanvasGroupData, CanvasNodeData } from 'obsidian/canvas';
import { group } from 'console';


export default async function startCopyProcess() {
	const canvasData: CanvasData = await readJson('/Users/matthias/Git/_Loopinum/bernstein/combinedData.json')
	//console.log(canvasData)
	// build matching table
	const websitePath = '/Users/matthias/Git/_Loopinum/website_ingravity__de/content/wissen'
	const vaultPath = '/Users/matthias/Git/_Loopinum/bernstein/Bernstein Vault/'

	const groups = canvasData.nodes.filter((node) => node.type === 'group') as CanvasGroupData[]
	groups.forEach((group) => {
		group.children.forEach((child) => {
			// search in CanvasData for this id (child)
			const node = canvasData.nodes.find((node) => node.id === child) as CanvasFileData
			node.file.split('/').pop()

			// build copyPath
			const copyPath = path.join(websitePath, group.label as string, node.file.split('/').pop() as string)
			console.log(group.label)
			//console.log(path.join(vaultPath, node.file))

			// copy file to copyPath

			// check if directory exists
			// if not create it
			const sourcePath = path.join(vaultPath, node.file)
			 
			try {
				fs.copyFile(sourcePath, copyPath)
				console.log('File was copied to', copyPath)
			} catch (error) {
				console.error('Error copying file:', error);
				throw error; // Rethrow to allow the caller to handle it
			}
		})
	})

	//console.log(groups)
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
