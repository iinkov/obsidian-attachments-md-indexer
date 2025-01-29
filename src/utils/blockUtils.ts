export function constructBlock(header: string, templateOfOneElement: string, listOfElements: string[], separator: string): string {
	function constructElement(template: string, element: string): string {
		return template.replace('{element}', element);
	}

	if (listOfElements.length === 0) return '';

	return `# ${header}\n\n` +
		listOfElements.map(element => constructElement(templateOfOneElement, element)).join(separator) +
		'\n\n';
}
