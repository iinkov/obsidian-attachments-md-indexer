import {vi} from 'vitest';
import {App, Plugin} from './__mocks__/obsidian';

vi.mock('obsidian', () => ({
    App,
    Plugin
})); 
