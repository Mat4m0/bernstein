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

	constructor(canvasPath: string) {
		this.canvasPath = canvasPath;
		this.canvasData = { nodes: [], edges: [] };
	}

	async readCanvasFile(): Promise<void> {
		try {
			const canvasFile = await fs.readFile(this.canvasPath, 'utf8');
			this.canvasData = JSON.parse(canvasFile);
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
					const subCanvas = new SubCanvas(path.join(BERNSTEIN_SETTINGS.vaultPath, subCanvasNode.file), parentCanvasData);
					await subCanvas.initialize();
				})
		);
	}

	// Method to combine canvasData from child canvases into the parent canvasData
	combineCanvasData(childCanvasData: CanvasData): void {
		this.canvasData.nodes = [...this.canvasData.nodes, ...childCanvasData.nodes];
		this.canvasData.edges = [...this.canvasData.edges, ...childCanvasData.edges];
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
		await this.checkForSubCanvas(this.combinedData);
		// Combine the data from this EntryCanvas into the main combinedData
		this.combineCanvasData(this.canvasData);
		
	}
}

class SubCanvas extends Canvas {
	constructor(canvasPath: string, private parentCanvasData: CanvasData) {
		super(canvasPath);
	}

	async initialize(): Promise<void> {
		await this.readCanvasFile();
		await this.checkForSubCanvas(this.parentCanvasData);
		// Combine this SubCanvas's canvasData with the parent's combinedData
		this.parentCanvasData.nodes = [...this.parentCanvasData.nodes, ...this.canvasData.nodes];
		this.parentCanvasData.edges = [...this.parentCanvasData.edges, ...this.canvasData.edges];
	}
}
