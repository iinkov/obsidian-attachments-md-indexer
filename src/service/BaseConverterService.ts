import { File, FileDao } from "../dao/FileDao";
import { FatalProcessingError } from './AttachmentParserService';

export interface ConversionConfig {
    indexFolder: string;
    sourceExtension: string;
    targetExtension: string;
}

export interface ConversionStats {
    createdCount: number;
    modifiedCount: number;
    removedCount: number;
    totalFiles: number;
}

export abstract class BaseConverterService {
    constructor(
        protected fileDao: FileDao,
        protected config: ConversionConfig
    ) {}

    async convertFiles(): Promise<ConversionStats> {
        try {
            await this.fileDao.createFolder(this.config.indexFolder);

            const allFiles = await this.fileDao.getFiles();
            const sourceFiles = allFiles.filter(f => f.path.endsWith(this.config.sourceExtension));
            const convertedFiles = allFiles.filter(f =>
                f.path.startsWith(`${this.config.indexFolder}/`) &&
                f.path.endsWith(this.config.targetExtension)
            );

            const [removedFiles, createdFiles, modifiedFiles] = await Promise.all([
                this.removeOrphanedFiles(convertedFiles, sourceFiles),
                this.createConvertedFiles(sourceFiles, convertedFiles),
                this.modifyConvertedFiles(sourceFiles, convertedFiles),
            ]);

            this.logConversionResults(removedFiles, createdFiles, modifiedFiles, sourceFiles.length);
            
            return {
                createdCount: createdFiles.count,
                modifiedCount: modifiedFiles.count,
                removedCount: removedFiles.length,
                totalFiles: sourceFiles.length
            };
        } catch (error) {
            console.error('Error during conversion:', error);
            
            if (error instanceof FatalProcessingError) {
                throw error;
            }

            return { createdCount: 0, modifiedCount: 0, removedCount: 0, totalFiles: 0 };
        }
    }

    protected abstract convertContent(source: File): Promise<string>;

    private formatReadableDate(timestampMs: number): string {
        const date = new Date(timestampMs);
        const pad = (n: number, length: number = 2) => n.toString().padStart(length, '0');
        
        return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
               `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}` +
               `${pad(date.getMilliseconds(), 3)}`;
    }

    protected getConvertedFilePath(source: File): string {
        const rawName = source.name.slice(0, -this.config.sourceExtension.length);
        const postfix = this.formatReadableDate(source.creationTime);
        return `${this.config.indexFolder}/${rawName}-${postfix}${this.config.targetExtension}`;
    }

    protected async removeOrphanedFiles(convertedFiles: File[], sourceFiles: File[]): Promise<string[]> {
        const validTargetPaths = new Set(sourceFiles.map(f => this.getConvertedFilePath(f)));

        const removedFiles = convertedFiles
            .filter(convertedFile => !validTargetPaths.has(convertedFile.path))
            .map(async convertedFile => {
                try {
                    await this.fileDao.deleteFile(convertedFile.path);
                    return convertedFile.path;
                } catch (error) {
                    console.error(`Failed to remove converted file ${convertedFile.path}:`, error);
                    return null;
                }
            });

        return (await Promise.all(removedFiles)).filter(Boolean) as string[];
    }

    protected async createConvertedFiles(sourceFiles: File[], convertedFiles: File[]): Promise<{
        count: number;
        files: string[]
    }> {
        const convertedFilePaths = new Set(convertedFiles.map(f => f.path));

        const processedNames = [];
        for (const source of sourceFiles) {
            const targetPath = this.getConvertedFilePath(source);
            if (!convertedFilePaths.has(targetPath)) {
                try {
                    await this.convertAndSave(source, targetPath);
                    processedNames.push(source.name);
                } catch (error) {
                    if (error instanceof FatalProcessingError) {
                        throw error;
                    }
                    console.error(`Error processing file ${source.name}:`, error);
                }
            }
        }
        return { count: processedNames.length, files: processedNames };
    }

    protected async modifyConvertedFiles(sourceFiles: File[], convertedFiles: File[]): Promise<{
        count: number;
        files: string[]
    }> {
        const convertedFileMap = new Map(
            convertedFiles.map(convertedFile => [
                convertedFile.path,
                convertedFile
            ])
        );

        const modifiedFileNames = [];
        for (const source of sourceFiles) {
            const targetPath = this.getConvertedFilePath(source);
            const convertedFile = convertedFileMap.get(targetPath);
            if (convertedFile && source.modifiedTime >= convertedFile.modifiedTime) {
                try {
                    await this.convertAndSave(source, targetPath);
                    modifiedFileNames.push(source.name);
                } catch (error) {
                    if (error instanceof FatalProcessingError) {
                        throw error;
                    }
                    console.error(`Error processing file ${source.name}:`, error);
                }
            }
        }

        return { count: modifiedFileNames.length, files: modifiedFileNames };
    }

    protected async convertAndSave(source: File, targetPath: string): Promise<void> {
        const convertedContent = await this.convertContent(source);
        await this.fileDao.createOrUpdateFile(targetPath, convertedContent);
    }

    protected logConversionResults(removedFiles: string[], createdFiles: {
        count: number;
        files: string[]
    }, modifiedFiles: { count: number; files: string[] }, totalFiles: number): void {
        console.log(
            `File conversion completed successfully\n` +
            `Total files processed ${createdFiles.count + modifiedFiles.count + removedFiles.length}/${totalFiles}\n` +
            `Created files ${createdFiles.count}\n` +
            (createdFiles.count > 0 ?
                `  ${createdFiles.files.map(f => `- ${f.replace(this.config.sourceExtension, '')}`).join('\n  ')}\n` : '') +
            `Modified files ${modifiedFiles.count}\n` +
            (modifiedFiles.count > 0 ?
                `  ${modifiedFiles.files.map(f => `- ${f.replace(this.config.sourceExtension, '')}`).join('\n  ')}\n` : '') +
            `Deleted files ${removedFiles.length}\n` +
            (removedFiles.length > 0 ?
                `  ${removedFiles.map(f => `- ${f.replace(`${this.config.indexFolder}/`, '').replace(this.config.targetExtension, '')}`).join('\n  ')}\n` : '')
        );
    }
} 