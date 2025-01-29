import * as fs from 'fs';
import * as path from 'path';

export function readTestFile(testFileName: string): string {
	return fs.readFileSync(
		path.resolve(__dirname, `../../test-data/${testFileName}`),
		'utf-8'
	);
}

export function createTestCanvasFile(fileDao: any, testFileName: string): Promise<void> {
	const canvasFilePath = testFileName;
	const canvasContent = readTestFile(testFileName);
	return fileDao.createOrUpdateFile(canvasFilePath, canvasContent);
}

export function generateTestCanvasFile(): string {
	return readTestFile('Test.canvas');
}

export function readGeneratedTestFile(fileName: string, postfix: string = ''): string {
	// Remove .md extension if present
	const baseName = fileName.replace(postfix, '');

	// Read the template file
	const templateContent = readTestFile('Test.canvas.md');

	// Replace all occurrences of Test.canvas with the new base name
	return templateContent.replace(/\[\[Test\.canvas\]\]/g, `[[${baseName}.canvas]]`);
}
