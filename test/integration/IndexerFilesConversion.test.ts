import {beforeEach, describe, expect, it} from 'vitest';
import {CanvasService} from '../../src/service/CanvasService';
import {FileDaoImpl} from '../../src/dao/FileDaoImpl';
import {InMemoryFileAdapter} from '../dao/InMemoryFileAdapter';
import {createTestCanvasFile, readGeneratedTestFile, readTestFile} from '../utils/testFileUtils';

describe('Integration Test: Canvas Indexer Conversion', () => {
	let fileAdapter: InMemoryFileAdapter;
	let fileDao: FileDaoImpl;
	let canvasService: CanvasService;
	let createCanvasFile: (filename: string) => Promise<void>;

	beforeEach(() => {
		fileAdapter = new InMemoryFileAdapter();

		fileDao = new FileDaoImpl(fileAdapter);

		const config = {
			canvasPostfix: '.canvas.md',
			runOnStart: false,
			indexFolder: 'index'
		};
		canvasService = new CanvasService(fileDao, config);

		// Clear dao to ensure a clean state
		fileAdapter.clear();

		// Create partially applied function
		createCanvasFile = (filename: string) => createTestCanvasFile(fileDao, filename);
	});

	it('should create a canvas file, run the indexer, and verify the .canvas.md file', async () => {
		// Step 1: Create a canvas file using the FileAdapter
		await createCanvasFile('Test.canvas');

		// Step 2: Run the indexer (assuming CanvasService handles indexing)
		await canvasService.convertAllCanvasFiles();

		// Step 3: Verify that the .canvas.md file is created and contains expected content
		const expectedMdPath = 'index/Test.canvas.md';
		const convertedContent = await fileAdapter.read(expectedMdPath);
		const expectedContent = readTestFile('Test.canvas.md');
		expect(convertedContent).toEqual(expectedContent);
	});

	it('should handle creation of multiple canvas files and verify corresponding .canvas.md files', async () => {
		// First file
		await createCanvasFile('Test.canvas');
		await canvasService.convertAllCanvasFiles();
		let convertedContent = await fileAdapter.read('index/Test.canvas.md');
		let expectedContent = readTestFile('Test.canvas.md');
		expect(convertedContent).toEqual(expectedContent);

		// Second file
		await createCanvasFile('Test-empty1.canvas');
		await canvasService.convertAllCanvasFiles();
		convertedContent = await fileAdapter.read('index/Test-empty1.canvas.md');
		expectedContent = readTestFile('Test-empty1.canvas.md');
		expect(convertedContent).toEqual(expectedContent);
	});

	it('should update an existing canvas file and verify the updated .canvas.md file', async () => {
		// Step 1: Create initial canvas file
		await createCanvasFile('Test.canvas');
		await canvasService.convertAllCanvasFiles();
		let convertedContent = await fileAdapter.read('index/Test.canvas.md');
		let expectedContent = readTestFile('Test.canvas.md');
		expect(convertedContent).toEqual(expectedContent);

		// Add small delay to ensure any modification would show a time difference
		await new Promise(resolve => setTimeout(resolve, 3));

		// Step 2: Update canvas file with new content
		const updatedContent = readTestFile('Test-single.canvas');
		await fileDao.createOrUpdateFile('Test.canvas', updatedContent);
		await canvasService.convertAllCanvasFiles();

		// Step 3: Verify updated .canvas.md file
		convertedContent = await fileAdapter.read('index/Test.canvas.md');
		expectedContent = readTestFile('Test-single.canvas.md');
		expectedContent = expectedContent.replace(/Test-single\.canvas/g, 'Test.canvas');
		expect(convertedContent).toEqual(expectedContent);
	});

	it('should handle empty vault with no canvas files', async () => {
		// Run indexer with no files
		await canvasService.convertAllCanvasFiles();

		// Verify no files were created
		expect(await fileDao.getFiles()).toHaveLength(0);
	});

	it('should process canvas files with empty content 1', async () => {
		// Create empty canvas file using the test helper
		await createCanvasFile('Test-empty1.canvas');

		// Run the indexer
		await canvasService.convertAllCanvasFiles();

		// Verify the .canvas.md file was created with empty content
		const mdContent = await fileAdapter.read('index/Test-empty1.canvas.md');
		expect(mdContent).toBeDefined();
		expect(mdContent).not.toContain('text');
	});

	it('should process canvas files with empty content 2', async () => {
		// Create empty canvas file using the test helper
		await createCanvasFile('Test-empty2.canvas');

		// Run the indexer
		await canvasService.convertAllCanvasFiles();

		// Verify the .canvas.md file was created with empty content
		const mdContent = await fileAdapter.read('index/Test-empty2.canvas.md');
		expect(mdContent).toBeDefined();
		expect(mdContent).not.toContain('text');
	});

	it('should handle file deletion scenarios', async () => {
		// Create and index a canvas file
		await createCanvasFile('Test.canvas');
		await canvasService.convertAllCanvasFiles();

		// Verify file was indexed
		const mdPath = 'index/Test.canvas.md';
		expect(await fileAdapter.read(mdPath)).toBeDefined();

		// Delete the canvas file
		await fileAdapter.delete('Test.canvas');
		await canvasService.convertAllCanvasFiles();

		// Verify markdown file was removed
		await expect(fileAdapter.read(mdPath)).rejects.toThrow();
		expect((await fileDao.getFiles()).map(f => f.path)).not.toContain(mdPath);
	});

	it('should recreate .canvas.md file if it was manually deleted', async () => {
		// Create and index a canvas file
		await createCanvasFile('Test.canvas');
		await canvasService.convertAllCanvasFiles();

		// Verify file was indexed
		const mdPath = 'index/Test.canvas.md';
		expect(await fileAdapter.read(mdPath)).toBeDefined();

		// Manually delete the .canvas.md file
		await fileAdapter.delete(mdPath);
		await expect(fileAdapter.read(mdPath)).rejects.toThrow();

		// Run indexer again
		await canvasService.convertAllCanvasFiles();

		// Verify the .canvas.md file was recreated
		const recreatedContent = await fileAdapter.read(mdPath);
		const expectedContent = readTestFile('Test.canvas.md');
		expect(recreatedContent).toBeDefined();
		expect(recreatedContent).toEqual(expectedContent);
		expect((await fileDao.getFiles()).map(f => f.path)).toContain(mdPath);
	});

	it('should not modify already indexed files when reindexing', async () => {
		// Create and index initial canvas file
		await createCanvasFile('Test.canvas');

		// Add small delay to ensure any modification would show a time difference
		await new Promise(resolve => setTimeout(resolve, 3));

		await canvasService.convertAllCanvasFiles();

		// Get the indexed file's modification time by reading it directly
		const mdPath = 'index/Test.canvas.md';
		const initialModifiedTime = (await fileAdapter.getFiles())
			.find(f => f.path === mdPath)?.modifiedTime;
		if (!initialModifiedTime) throw new Error('Could not get initial modified time');


		// Add small delay to ensure any modification would show a time difference
		await new Promise(resolve => setTimeout(resolve, 3));

		// Run indexer again
		await canvasService.convertAllCanvasFiles();

		// Get the indexed file's modification time again
		const finalModifiedTime = (await fileAdapter.getFiles())
			.find(f => f.path === mdPath)?.modifiedTime;
		if (!finalModifiedTime) throw new Error('Could not get final modified time');

		// Verify modification time is exactly the same
		expect(finalModifiedTime).toBe(initialModifiedTime);
	});

	it('should handle canvas files in subfolders and multiple indexing', async () => {
		// Create canvas file in sub folder
		await createCanvasFile('sub folder/Test.canvas');

		// Add small delay to ensure any modification would show a time difference
		await new Promise(resolve => setTimeout(resolve, 3));

		// First indexing
		await canvasService.convertAllCanvasFiles();

		// Verify initial conversion
		const mdPath1 = 'index/Test.canvas.md';
		let convertedContent = await fileAdapter.read(mdPath1);
		let expectedContent = readTestFile('Test.canvas.md');
		expect(convertedContent).toEqual(expectedContent);

		// Get initial modification time
		const initialModifiedTime = (await fileAdapter.getFiles())
			.find(f => f.path === mdPath1)?.modifiedTime;
		if (!initialModifiedTime) throw new Error('Could not get initial modified time');

		// Add small delay to ensure any modification would show a time difference
		await new Promise(resolve => setTimeout(resolve, 3));

		// Second indexing
		await canvasService.convertAllCanvasFiles();

		// Verify content remains consistent
		convertedContent = await fileAdapter.read(mdPath1);
		expect(convertedContent).toEqual(expectedContent);

		// Verify modification time remains the same
		const finalModifiedTime = (await fileAdapter.getFiles())
			.find(f => f.path === mdPath1)?.modifiedTime;
		if (!finalModifiedTime) throw new Error('Could not get final modified time');
		expect(finalModifiedTime).toBe(initialModifiedTime);

		// Update canvas file
		const updatedContent = readTestFile('Test-single.canvas');
		await fileDao.createOrUpdateFile('sub folder/Test.canvas', updatedContent);

		// Third indexing
		await canvasService.convertAllCanvasFiles();

		// Verify updated content
		convertedContent = await fileAdapter.read(mdPath1);
		expectedContent = readTestFile('Test-single.canvas.md');
		expectedContent = expectedContent.replace(/Test-single\.canvas/g, 'Test.canvas');
		expect(convertedContent).toEqual(expectedContent);

		// Delete canvas file using adapter directly
		await fileAdapter.delete('sub folder/Test.canvas');

		// Fourth indexing
		await canvasService.convertAllCanvasFiles();

		// Verify markdown file was removed
		await expect(fileAdapter.read(mdPath1)).rejects.toThrow();
		expect((await fileDao.getFiles()).map(f => f.path)).not.toContain(mdPath1);
	});

	it('should handle deletion of canvas files in subfolders', async () => {
		// Create canvas file in subfolder
		await createCanvasFile('sub folder/Test.canvas');

		// Index the files
		await canvasService.convertAllCanvasFiles();

		// Verify the .canvas.md file exists
		const mdPath = 'index/Test.canvas.md';
		expect(await fileAdapter.read(mdPath)).toBeDefined();

		// Delete the canvas file
		await fileAdapter.delete('sub folder/Test.canvas');

		// Re-index the files
		await canvasService.convertAllCanvasFiles();

		// Verify the .canvas.md file has been deleted
		await expect(fileAdapter.read(mdPath)).rejects.toThrow();
	});

	it('should update index file when source canvas file is modified', async () => {
		// Create initial canvas file
		await createCanvasFile('Test.canvas');
		await canvasService.convertAllCanvasFiles();

		// Get initial content
		const mdPath = 'index/Test.canvas.md';
		const initialContent = await fileAdapter.read(mdPath);

		// Modify source canvas file
		const updatedCanvasContent = readTestFile('Test-single.canvas');
		await fileDao.createOrUpdateFile('Test.canvas', updatedCanvasContent);

		// Reindex
		await canvasService.convertAllCanvasFiles();

		// Get updated content
		const updatedContent = await fileAdapter.read(mdPath);

		// Verify content changed
		expect(updatedContent).not.toEqual(initialContent);
	});


	it.each([
		{postfix: '.md', folder: 'index'},
		{postfix: '.canvas.md', folder: '_index'},
		{postfix: '.canvas.md', folder: 'notes'},
		{postfix: '.canvas.md', folder: 'canvas-notes'},
		{postfix: '-canvas.md', folder: 'index'},
		{postfix: '(index).md', folder: 'index/canvas'},
		{postfix: '.canvas.md', folder: 'my index'},
		{postfix: '.canvas.md', folder: 'my index folder'},
		{postfix: '.canvas.md', folder: 'index/my notes'},
		{postfix: '.canvas.md', folder: 'index/my canvas notes'},
		{postfix: '.canvas.md', folder: 'index/my index'},
	])('should handle different configs - postfix: $postfix, folder: $folder', async ({postfix, folder}) => {
		// Create service with custom config
		const config = {
			canvasPostfix: postfix,
			runOnStart: false,
			indexFolder: folder
		};
		const customCanvasService = new CanvasService(fileDao, config);

		// Create test canvas file and multiple regular markdown files
		await createCanvasFile('Test.canvas');
		await fileDao.createOrUpdateFile('RegularNote.md', '# Regular Note Content');
		await fileDao.createOrUpdateFile('AnotherNote.md', '## Another Note');
		await fileDao.createOrUpdateFile('subfolder/NoteInSub.md', '### Subfolder Note');

		// Add delay to ensure stable timestamps
		await new Promise(resolve => setTimeout(resolve, 3));

		// Run conversion
		await customCanvasService.convertAllCanvasFiles();

		// Verify output file path and content
		const expectedPath = `${folder}/Test${postfix}`;
		const convertedContent = await fileAdapter.read(expectedPath);
		const expectedContent = readGeneratedTestFile(`Test`);

		expect(convertedContent).toEqual(expectedContent);

		// Verify reindexing doesn't modify the file
		const initialModifiedTime = (await fileAdapter.getFiles())
			.find(f => f.path === expectedPath)?.modifiedTime;
		if (!initialModifiedTime) throw new Error('Could not get initial modified time');

		// Verify all regular markdown files still exist and weren't modified
		const regularNoteContent = await fileDao.readFile('RegularNote.md');
		expect(regularNoteContent).toEqual('# Regular Note Content');

		// Add small delay to ensure any modification would show a time difference
		await new Promise(resolve => setTimeout(resolve, 3));

		// Reindex
		await customCanvasService.convertAllCanvasFiles();

		// Verify content and modification time remain the same
		const finalModifiedTime = (await fileAdapter.getFiles())
			.find(f => f.path === expectedPath)?.modifiedTime;
		if (!finalModifiedTime) throw new Error('Could not get final modified time');

		expect(finalModifiedTime).toBe(initialModifiedTime);
		expect(await fileAdapter.read(expectedPath)).toEqual(expectedContent);

		const anotherNoteContent = await fileDao.readFile('AnotherNote.md');
		expect(anotherNoteContent).toEqual('## Another Note');

		const subNoteContent = await fileDao.readFile('subfolder/NoteInSub.md');
		expect(subNoteContent).toEqual('### Subfolder Note');
	});
});
