import {defineConfig} from 'vitest/config';

export default defineConfig({
	test: {
		globals: true,
		mockReset: true,
		clearMocks: true,
		setupFiles: ['./test/setup.ts']
	},
	resolve: {
		alias: {
			obsidian: 'test/__mocks__/obsidian.ts'
		}
	}
}); 
