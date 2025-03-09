import { File, FileDao } from "../dao/FileDao";
import { FatalProcessingError } from './AttachmentParserService';

export interface ConversionConfig {
    indexFolder: string;
    sourceExtension: string;
    targetExtension: string;
}

export abstract class BaseConverterService {
    constructor(
        protected fileDao: FileDao,
        protected config: ConversionConfig
    ) {}

    async convertFiles(): Promise<void> {
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
        } catch (error) {
            console.error('Error during conversion:', error);
            
            if (error instanceof FatalProcessingError) {
                throw error;
            }
        }
    }

    protected abstract convertContent(source: File): Promise<string>;

    protected getSourceName(file: File): string {
        return file.name.slice(0, -this.config.targetExtension.length) + this.config.sourceExtension;
    }

    protected getConvertedFilePath(sourceName: string): string {
        return `${this.config.indexFolder}/${sourceName.slice(0, -this.config.sourceExtension.length)}${this.config.targetExtension}`;
    }

    protected async removeOrphanedFiles(convertedFiles: File[], sourceFiles: File[]): Promise<string[]> {
        const sourceNames = new Set(sourceFiles.map(f => f.name));

        const removedFiles = convertedFiles
            .filter(convertedFile => !sourceNames.has(this.getSourceName(convertedFile)))
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
        const convertedNames = new Set(convertedFiles.map(f => this.getSourceName(f)));

        const processedNames = [];
        for (const source of sourceFiles.filter(source => !convertedNames.has(source.name))) {
            try {
                const targetPath = this.getConvertedFilePath(source.name);
                await this.convertAndSave(source, targetPath);
                processedNames.push(source.name);
            } catch (error) {
                if (error instanceof FatalProcessingError) {
                    throw error;
                }
                console.error(`Error processing file ${source.name}:`, error);
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
                this.getSourceName(convertedFile),
                convertedFile
            ])
        );

        const modifiedFileNames = [];
        for (const source of sourceFiles) {
            const convertedFile = convertedFileMap.get(source.name);
            if (convertedFile && source.modifiedTime >= convertedFile.modifiedTime) {
                try {
                    const targetPath = this.getConvertedFilePath(source.name);
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