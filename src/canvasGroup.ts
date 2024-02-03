import * as fs from 'fs';

// Define TypeScript types for nodes and groups
type Node = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: string;
  label: string;
  file?: string;
};

type Group = Node & {
  children: string[];
};

export default function startProcess() {
  // Read the JSON file
  const rawData = fs.readFileSync(
    '/Users/matthias/Git/_Loopinum/bernstein/Bernstein Vault/5. DOCS/BEESPACE/Entry.canvas',
    'utf8'
  );
  const jsonData = JSON.parse(rawData);
  console.log('JSON file read.');

  const combinedNodes = {}

  // Function to check if one group is contained within another
  function isContainedIn(groupA: Node, groupB: Node): boolean {
    return (
      groupA.x >= groupB.x &&
      groupA.y >= groupB.y &&
      groupA.x + groupA.width <= groupB.x + groupB.width &&
      groupA.y + groupA.height <= groupB.y + groupB.height
    );
  }

  // Create a function to add children property to groups
  function addChildrenToGroups(groups: Group[]): void {
    groups.forEach((groupA) => {
      groupA.children = groups
        .filter((groupB) => groupB.id !== groupA.id && isContainedIn(groupB, groupA))
        .map((groupB) => groupB.id);
    });
  }

  // Recursive function to process .canvas files
  function processCanvasFile(filePath: string, currentJsonData: any, processedCanvasSet: Set<string>): void {
    // Check if this canvas file has already been processed
    if (processedCanvasSet.has(filePath)) {
      console.log(`Skipping already processed canvas: ${filePath}`);
      return;
    }

    // Mark this canvas file as processed
    processedCanvasSet.add(filePath);

    // Read and process the .canvas file
    const canvasRawData = fs.readFileSync(filePath, 'utf8');
    const canvasData = JSON.parse(canvasRawData);

    // Print the JSON structure to the console
	const file = filePath.split("/").pop();
	console.log(`Processed .canvas file: ${file}`);

    console.log(canvasData);

    // Check if there are nested .canvas files and recursively process them
    canvasData.nodes
      .filter((node: Node) => node.type === 'file' && node.file && node.file.endsWith('.canvas'))
      .forEach((canvasNode: Node) => {
        // Construct the full path to the .canvas file
        const canvasFilePath = `/Users/matthias/Git/_Loopinum/bernstein/Bernstein Vault/${canvasNode.file}`;

        // Call the recursive function to process the nested .canvas file
        processCanvasFile(canvasFilePath, canvasData, processedCanvasSet);


      });
  }

  const groups: Group[] = jsonData.nodes.filter((node: Node) => node.type === 'group') as Group[];

  // Add children property to groups
  addChildrenToGroups(groups);

  // Create a set to keep track of processed canvases
  const processedCanvasSet = new Set<string>();

  // Call the recursive function to process .canvas files starting with the original JSON data
  processCanvasFile(
    '/Users/matthias/Git/_Loopinum/bernstein/Bernstein Vault/5. DOCS/BEESPACE/Entry.canvas',
    jsonData,
    processedCanvasSet
  );

  // Rest of the code remains the same

  console.log('Children property added and cleaned up.');
  console.log(jsonData);

  // Save the updated JSON to a file
  fs.writeFileSync(
    '/Users/matthias/Git/_Loopinum/bernstein/Bernstein Vault/5. DOCS/BEESPACE/Fucker.json',
    JSON.stringify(jsonData, null, 2)
  );

  console.log('JSON processing completed.');
}
