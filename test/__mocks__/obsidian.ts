import {vi} from 'vitest';

export class App {
    vault = {
        adapter: {
            exists: vi.fn(),
            mkdir: vi.fn(),
            read: vi.fn(),
            write: vi.fn()
        },
        getFiles: vi.fn(),
        read: vi.fn(),
        getAbstractFileByPath: vi.fn(),
        create: vi.fn(),
        createFolder: vi.fn()
    };
}

export class Plugin {
    manifest = {
        dir: '/test'
    };
} 
