// groups.ts
import * as fs from 'fs';


export default function startProcess() {

	// Read the JSON file
	const rawData = fs.readFileSync('/Users/matthias/Git/_Loopinum/bernstein/Bernstein Vault/5. DOCS/BEESPACE/Test.canvas', 'utf8');
	const jsonData = JSON.parse(rawData);
	console.log('JSON file read.');


	// Function to check if one group is contained within another
	function isContainedIn(groupA: any, groupB: any): boolean {
		return (
			groupA.x >= groupB.x &&
			groupA.y >= groupB.y &&
			groupA.x + groupA.width <= groupB.x + groupB.width &&
			groupA.y + groupA.height <= groupB.y + groupB.height
		);
	}

	// Create a function to add children property to groups
	function getChildren(nodeId: string): string[] {
		const children = jsonData.nodes
			.filter((node) => node.type === 'group')
			.filter((node) => {
				if (node.id === nodeId) return false;
				return isContainedIn(node, jsonData.nodes.find((n) => n.id === nodeId));
			})
			.map((node) => node.label);

		return children;
	}

	// Update nodes with children property
	jsonData.nodes = jsonData.nodes.map((node) => ({
		...node,
		children: getChildren(node.id),
	}));

// Create a function to clean up the redundant children property
function cleanupChildren() {
	jsonData.nodes.forEach((node: any) => {
	  const removeLabels: string[] = [];

	  node.children.forEach((parentChildren: any) => {
		// Filter the jsonData.nodes to find the node with the label of the child
		const parentNode = jsonData.nodes.find((childNode: any) => childNode.label === parentChildren);
		if (parentNode) {
		  parentNode.children.forEach((childChildren: any) => {
			removeLabels.push(childChildren);
		  });
		}
	  });
  
	  // Remove duplicates from removeLabels
	  const uniqueRemoveLabels = [...new Set(removeLabels)];
  
	  // Update the node's children property by removing the redundant children
	  node.children = node.children.filter((child: string) => !uniqueRemoveLabels.includes(child));

	});
  }
  
  // Call the cleanupChildren function
  cleanupChildren();
  
  // Rest of the code remains the same
  


	// Call the cleanupChildren function
	cleanupChildren();
	console.log('Children property added and cleaned up.');
	console.log(jsonData)


	// Save the updated JSON to a file
	fs.writeFileSync('your_output_file.json', JSON.stringify(jsonData, null, 2));

	console.log('JSON processing completed.');

}
