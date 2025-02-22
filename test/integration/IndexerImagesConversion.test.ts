import {beforeEach, describe, expect, it} from 'vitest';
import {CanvasService} from '../../src/service/CanvasService';
import {FileDaoImpl} from '../../src/dao/FileDaoImpl';
import {InMemoryFileAdapter} from '../dao/InMemoryFileAdapter';
import {createTestImageFile, readTestFile} from '../utils/testFileUtils';

describe('Integration Test: Image Indexer Conversion', () => {
    let fileAdapter: InMemoryFileAdapter;
    let fileDao: FileDaoImpl;
    let canvasService: CanvasService;
    let createImageFile: (filename: string) => Promise<void>;

    beforeEach(() => {
        fileAdapter = new InMemoryFileAdapter();
        fileDao = new FileDaoImpl(fileAdapter);

        const config = {
            canvasPostfix: '.png.md',
            runOnStart: false,
            indexFolder: 'index'
        };
        canvasService = new CanvasService(fileDao, config);

        // Clear dao to ensure a clean state
        fileAdapter.clear();

        // Create partially applied function
        createImageFile = (filename: string) => createTestImageFile(fileDao, filename);
    });

    it('should create an image file, run the indexer, and verify the .png.md file', async () => {
        // Step 1: Create a test image file using the FileAdapter
        await createImageFile('test-image.png');

        // Step 2: Run the indexer
        await canvasService.convertAllCanvasFiles();

        // Step 3: Verify that the .md file is created and contains expected content
        const expectedMdPath = 'index/test-image.png.md';
        const convertedContent = await fileAdapter.read(expectedMdPath);
        const expectedContent = readTestFile('test-image.png.md');
        expect(convertedContent).toEqual(expectedContent);
    });
}); 