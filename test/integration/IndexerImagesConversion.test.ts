import {beforeEach, describe, expect, it} from 'vitest';
import {PngConverterService} from '../../src/service/image/PngConverterService';
import {FileDaoImpl} from '../../src/dao/FileDaoImpl';
import {InMemoryFileAdapter} from '../dao/InMemoryFileAdapter';
import {createTestImageFile, readTestFile} from '../utils/testFileUtils';

describe('Integration Test: Image Indexer Conversion', () => {
    let fileAdapter: InMemoryFileAdapter;
    let fileDao: FileDaoImpl;
    let pngConverter: PngConverterService;
    let createImageFile: (filename: string) => Promise<void>;

    beforeEach(() => {
        fileAdapter = new InMemoryFileAdapter();
        fileDao = new FileDaoImpl(fileAdapter);
        pngConverter = new PngConverterService(fileDao, 'index');

        // Clear dao to ensure a clean state
        fileAdapter.clear();

        // Create partially applied function with adapter instead of fileDao
        createImageFile = (filename: string) => createTestImageFile(fileAdapter, filename);
    });

    it('should create an image file, run the indexer, and verify the .png.md file', async () => {
        // Step 1: Create a test image file using the FileAdapter
        await createImageFile('test-image.png');

        // Step 2: Run the indexer
        await pngConverter.convertFiles();

        // Step 3: Verify that the .md file is created and contains expected content
        const expectedMdPath = 'index/test-image.png.md';
        const convertedContent = await fileAdapter.read(expectedMdPath);
        const expectedContent = readTestFile('test-image.png.md');
        expect(convertedContent).toEqual(expectedContent);
    }, { timeout: 30000 });

    it('should handle multiple image files', async () => {
        await createImageFile('test-image.png');
        await createImageFile('test-image2.png');
        await pngConverter.convertFiles();

        const paths = ['index/test-image.png.md', 'index/test-image2.png.md'];
        for (const path of paths) {
            const convertedContent = await fileAdapter.read(path);
            const expectedContent = readTestFile(path.split('/').pop() || '');
            expect(convertedContent).toEqual(expectedContent);
        }
    });

    it.skip('should update modified image files', async () => {
        await createImageFile('test-image.png');
        await pngConverter.convertFiles();

        await new Promise(resolve => setTimeout(resolve, 3));
        await createImageFile('test-image.png'); // Update with same content
        await pngConverter.convertFiles();

        const expectedMdPath = 'index/test-image.png.md';
        const convertedContent = await fileAdapter.read(expectedMdPath);
        const expectedContent = readTestFile('test-image.png.md');
        expect(convertedContent).toEqual(expectedContent);
    });

    it.skip('should remove orphaned files', async () => {
        await createImageFile('test-image.png');
        await pngConverter.convertFiles();

        const mdPath = 'index/test-image.png.md';
        expect(await fileAdapter.read(mdPath)).toBeDefined();

        await fileAdapter.delete('test-image.png');
        await pngConverter.convertFiles();

        await expect(fileAdapter.read(mdPath)).rejects.toThrow();
    });
}); 