import {describe, expect, it} from 'vitest';
import {readFileSync, writeFileSync} from 'fs';
import * as path from 'path';
import {convertCanvasToMd} from '../src/utils/canvasToMd';

// Load test canvas files
const TEST_CANVAS_PATH = path.join(__dirname, '../test-data/Test.canvas');
const TEST_CANVAS_MD_PATH = path.join(__dirname, '../test-data/Test.canvas.md');
const TEST_CANVAS_MD_OUTPUT_PATH = path.join(__dirname, '../test-data/Test.canvas-T.md');

const TEST_CANVAS = JSON.parse(readFileSync(TEST_CANVAS_PATH, 'utf-8'));
const TEST_CANVAS_MD = readFileSync(TEST_CANVAS_MD_PATH, 'utf-8');

describe('canvasToMd', () => {
	it('should convert canvas to markdown exactly matching expected format', () => {
		const sourceFileName = path.basename(TEST_CANVAS_PATH);
		const convertedMd = convertCanvasToMd(JSON.stringify(TEST_CANVAS), sourceFileName);
		writeFileSync(TEST_CANVAS_MD_OUTPUT_PATH, convertedMd);
		expect(convertedMd.split('\n')).toEqual(TEST_CANVAS_MD.split('\n'));
	});
});
