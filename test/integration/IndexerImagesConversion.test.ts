import {beforeEach, describe, expect, it} from 'vitest';
import {PngConverterService} from '../../src/service/PngConverterService';
import {FileDaoImpl} from '../../src/dao/FileDaoImpl';
import {InMemoryFileAdapter} from '../dao/InMemoryFileAdapter';
import {createTestImageFile} from '../utils/testFileUtils';
import { IMAGE_FILE_DESCRIPTION } from '../../src/utils/constants';
import { GeminiAttachmentParserService } from '../../src/service/AttachmentParserService';
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
        const imageParser = new GeminiAttachmentParserService(
            {getApiKey: () => apiKey}, 
            'image/png',
            "Parse text from the image. Return full text and also give me description of the image"
        );
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

    async function getIndexedFilePath(sourceName: string): Promise<string> {
        const files = await fileAdapter.getFiles();
        const baseName = sourceName.split('.').slice(0, -1).join('.');
        const match = files.find(f => 
            f.path.startsWith(`index/${baseName}-`) && 
            f.path.endsWith('.png.md')
        );
        if (!match) throw new Error(`Indexed file not found for ${sourceName}`);
        return match.path;
    }

    it('should create an image file, run the indexer, and verify the .png.md file', async () => {
        // Step 1: Create a test image file using the FileAdapter
        await createImageFile('test-image.png');

        // Step 2: Run the indexer
        await pngConverter.convertFiles();

        // Step 3: Verify that the .md file is created and contains expected structure
        const expectedMdPath = await getIndexedFilePath('test-image.png');
        const convertedContent = await fileAdapter.read(expectedMdPath);
        verifyMarkdownStructure(convertedContent, 'test-image.png');
    }, { timeout: TEST_TIMEOUT });

    it('should handle multiple image files', async () => {
        await createImageFile('test-image.png');
        await createImageFile('test-image2.png');
        await pngConverter.convertFiles();

        const fileData = [
            { source: 'test-image.png', name: 'test-image.png' },
            { source: 'test-image2.png', name: 'test-image2.png' }
        ];

        for (const data of fileData) {
            const path = await getIndexedFilePath(data.source);
            const convertedContent = await fileAdapter.read(path);
            verifyMarkdownStructure(convertedContent, data.name);
        }
    }, { timeout: TEST_TIMEOUT });

    it('should update modified image files', async () => {
        await createImageFile('test-image.png');
        await pngConverter.convertFiles();

        await new Promise(resolve => setTimeout(resolve, 3));
        await createImageFile('test-image2.png');
        await pngConverter.convertFiles();

        const expectedMdPath = await getIndexedFilePath('test-image2.png');
        const convertedContent = await fileAdapter.read(expectedMdPath);
        verifyMarkdownStructure(convertedContent, 'test-image2.png');
    }, { timeout: TEST_TIMEOUT });

    it.skip('should remove orphaned files', async () => {
        await createImageFile('test-image.png');
        await pngConverter.convertFiles();

        const mdPath = await getIndexedFilePath('test-image.png');
        expect(await fileAdapter.read(mdPath)).toBeDefined();

        await fileAdapter.delete('test-image.png');
        await pngConverter.convertFiles();

        await expect(fileAdapter.read(mdPath)).rejects.toThrow();
    }, { timeout: TEST_TIMEOUT });
}); 