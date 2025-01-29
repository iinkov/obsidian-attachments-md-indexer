import {extractElements, isNode, parseCanvasContent} from './fileUtils'; // Import parseCanvasContent
import {constructBlock} from './blockUtils';
import {CARD_TEMPLATE, INDEX_FILE_TEMPLATE, MEDIA_TEMPLATE, NOTE_TEMPLATE, WEBPAGE_TEMPLATE} from './constants';
import { CanvasJson } from './fileUtils'; // Import CanvasJson and CanvasNode from fileUtils

function getMainBlock(fileName: string): string {
	return constructBlock(
		fileName,
		INDEX_FILE_TEMPLATE,
		[fileName],
		"\n\n"
	);
}

function getCards(json: CanvasJson): string[] {
	return extractElements(json, "text", "text");
}

function getNotes(json: CanvasJson): string[] {
	return extractElements(json, "file", "file")
		.filter(isNode)
		.map((notePath: string) => {
			return notePath.replace(/\.md$/, '').split('/').pop() || notePath;
		});
}

function getWebPages(json: CanvasJson): string[] {
	return extractElements(json, "link", "url")
		.sort((a, b) => a.localeCompare(b));
}

function getMediaFiles(json: CanvasJson): string[] {
	return extractElements(json, "file", "file")
		.filter((filePath: string) => !isNode(filePath));
}

function buildContentBlocks(cards: string[], notes: string[], webPages: string[], medias: string[]): string {
	const cardsBlock = constructBlock("Cards", CARD_TEMPLATE, cards, "\n\n");
	const notesBlock = constructBlock("Notes", NOTE_TEMPLATE, notes, "\n\n<br/>\n\n");
	const webPagesBlock = constructBlock("Web Pages", WEBPAGE_TEMPLATE, webPages, "\n\n<br/>\n\n");
	const mediasBlock = constructBlock("Medias", MEDIA_TEMPLATE, medias, "\n\n<br/>\n\n");

	return cardsBlock + notesBlock + webPagesBlock + mediasBlock;
}

export function convertCanvasToMd(content: string, fileName: string): string {
	const mainBlock = getMainBlock(fileName);

	const parsedJson = parseCanvasContent(content);
	if (parsedJson === null) { // Check for null directly
		return mainBlock;
	}

	// Now parsedJson is not null, and parseCanvasContent returns CanvasJson | null, so it's safe to cast.
	const json = parsedJson as CanvasJson;
	const cards = getCards(json);
	const notes = getNotes(json);
	const webPages = getWebPages(json);
	const medias = getMediaFiles(json);

	return mainBlock + buildContentBlocks(cards, notes, webPages, medias);
}
