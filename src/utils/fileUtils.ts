export interface CanvasNode {
	type: string;
	[key: string]: unknown;
}

export interface CanvasJson {
	nodes: CanvasNode[];
}

export function parseCanvasContent(content: string): CanvasJson | null {
	if (!content) {
		return null;
	}

	try {
		const trimmedContent = content.trim();
		if (!trimmedContent) {
			return null;
		}

		const json = JSON.parse(trimmedContent);
		if (!json || typeof json !== 'object' || json === null || !('nodes' in json) || !Array.isArray(json.nodes)) {
			return null;
		}
		return json as CanvasJson;
	} catch (e) {
		return null;
	}
}

export function extractElements(json: CanvasJson, typeName: string, contentFieldName: string): string[] {
	let nodes: CanvasNode[] = [];
	if (typeof json === 'object' && json !== null && 'nodes' in json && Array.isArray(json.nodes)) {
		nodes = json.nodes as CanvasNode[];
	}
	return nodes
		.filter((node: CanvasNode) => node.type === typeName)
		.map((node: CanvasNode) => {
			const content = typeof node[contentFieldName] === 'string' ? node[contentFieldName] : '';
			return content as string;
		});
}

export function getExtension(path: string): string {
	return path.split('.').pop() || '';
}

export function isNode(filePath: string): boolean {
	const ext = getExtension(filePath);
	return ext === 'md' || ext === '';
}

export function parseCanvasData(canvasContent: string): CanvasNode[] | null {
	try {
		const json = JSON.parse(canvasContent);
		let nodes: CanvasNode[] = [];

		if (json && typeof json === 'object' && 'nodes' in json && Array.isArray(json.nodes)) {
			nodes = json.nodes as CanvasNode[];
		} else {
			console.error('JSON does not contain a valid nodes array.');
			return null;
		}
		return nodes;
	} catch (error) {
		console.error('Error parsing JSON content:', error);
		return null;
	}
}
