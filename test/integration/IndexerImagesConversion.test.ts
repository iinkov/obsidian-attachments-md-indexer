import {beforeEach, describe, expect, it} from 'vitest';
import {PngConverterService} from '../../src/service/PngConverterService';
import {FileDaoImpl} from '../../src/dao/FileDaoImpl';
import {InMemoryFileAdapter} from '../dao/InMemoryFileAdapter';
import {createTestImageFile} from '../utils/testFileUtils';
import { IMAGE_FILE_DESCRIPTION } from '../../src/utils/constants';
import { GeminiImageParserService } from '../../src/service/ImageParserService';
import { config } from 'dotenv';

// Load environment variables from .env file
config();

describe('Integration Test: Image Indexer Conversion', () => {
    const TEST_TIMEOUT = 30000;
    let fileAdapter: InMemoryFileAdapter;
    let fileDao: FileDaoImpl;
    let pngConverter: PngConverterService;
    let createImageFile: (filename: string) => Promise<void>;

    beforeEach(() => {
        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) {
            throw new Error('GOOGLE_API_KEY environment variable is required for tests');
        }

        fileAdapter = new InMemoryFileAdapter();
        fileDao = new FileDaoImpl(fileAdapter);
        const imageParser = new GeminiImageParserService({getApiKey: () => apiKey});
        pngConverter = new PngConverterService(fileDao, 'index', imageParser);

        // Clear dao to ensure a clean state
        fileAdapter.clear();

        // Create partially applied function with adapter instead of fileDao
        createImageFile = (filename: string) => createTestImageFile(fileAdapter, filename);
    });

    function verifyMarkdownStructure(content: string, imageName: string) {
        // Check header
        expect(content).toContain(`# ${imageName}`);
        
        // Check image embed
        expect(content).toContain(`![[${imageName}|500]]`);
        
        // Check description
        expect(content).toContain(IMAGE_FILE_DESCRIPTION);
        
        // Check that there is some AI-generated content
        expect(content).toContain('# Image Content');
        
        // Ensure there's substantial content
        expect(content.length).toBeGreaterThan(200);
    }

    it('should create an image file, run the indexer, and verify the .png.md file', async () => {
        // Step 1: Create a test image file using the FileAdapter
        await createImageFile('test-image.png');

        // Step 2: Run the indexer
        await pngConverter.convertFiles();

        // Step 3: Verify that the .md file is created and contains expected structure
        const expectedMdPath = 'index/test-image.png.md';
        const convertedContent = await fileAdapter.read(expectedMdPath);
        verifyMarkdownStructure(convertedContent, 'test-image.png');
    }, { timeout: TEST_TIMEOUT });

    it('should handle multiple image files', async () => {
        await createImageFile('test-image.png');
        await createImageFile('test-image2.png');
        await pngConverter.convertFiles();

        const files = [
            { path: 'index/test-image.png.md', name: 'test-image.png' },
            { path: 'index/test-image2.png.md', name: 'test-image2.png' }
        ];

        for (const file of files) {
            const convertedContent = await fileAdapter.read(file.path);
            verifyMarkdownStructure(convertedContent, file.name);
        }
    }, { timeout: TEST_TIMEOUT });

    it('should update modified image files', async () => {
        await createImageFile('test-image.png');
        await pngConverter.convertFiles();

        await new Promise(resolve => setTimeout(resolve, 3));
        await createImageFile('test-image2.png');
        await pngConverter.convertFiles();

        const expectedMdPath = 'index/test-image2.png.md';
        const convertedContent = await fileAdapter.read(expectedMdPath);
        verifyMarkdownStructure(convertedContent, 'test-image2.png');
    }, { timeout: TEST_TIMEOUT });

    it.skip('should remove orphaned files', async () => {
        await createImageFile('test-image.png');
        await pngConverter.convertFiles();

        const mdPath = 'index/test-image.png.md';
        expect(await fileAdapter.read(mdPath)).toBeDefined();

        await fileAdapter.delete('test-image.png');
        await pngConverter.convertFiles();

        await expect(fileAdapter.read(mdPath)).rejects.toThrow();
    }, { timeout: TEST_TIMEOUT });
}); 