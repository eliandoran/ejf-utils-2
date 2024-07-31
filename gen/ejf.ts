import { BlobWriter, TextReader, Uint8ArrayReader, ZipWriter } from "https://raw.githubusercontent.com/eliandoran/zip.js/9ac0e13238e7b386c2242425576b616536ae2f70/index.js";
import parseCharRange from "./char_range.ts";
import Renderer from "./renderer.ts";
import buildHeader from "./header.ts";
import { join, resolve } from "jsr:@std/path@^1.0.0";
import GenerationError from "./errors.ts";
import { EjfConfig } from "./config.ts";

export interface ProgressData {
    current: number,
    total: number,
    /** The height of the generated font, in pixels. */
    height: number
}

export default async function buildEjf(config: EjfConfig, workingDir: string, progressData: ProgressData) {
    const charRange = parseCharRange(config);    
    if (!charRange.length) {
        throw new GenerationError(`The font ${config.name} has no characters.`);
    }

    const ttfPath = resolve(workingDir, config.input);
    const renderer = new Renderer(ttfPath, config.size);
    progressData.height = renderer.totalHeight;
    
    const blobWriter = new BlobWriter("application/zip");
    const date = new Date(315522000000);
    const writer = new ZipWriter(blobWriter, {
        // No compression to speed up writing time but also since PNGs generally don't compress that well.
        level: 0,
        // Remove unnecessary metadata to maintain as much compatibility as possible with previous implementation.
        dataDescriptor: false,
        extendedTimestamp: false,
        useUnicodeFileNames: false,
        
        // We set a neutral timestamp to avoid the creation date changing the ZIP.
        lastModDate: date,
    });

    // Render each character.
    await writeCharacters(writer, charRange, renderer, progressData);

    // Write the header
    await writeHeader(writer, charRange, renderer, config);

    await writer.close();
    
    const data = await blobWriter.getData();
    const outputPath = join(workingDir, config.outputDir || "", config.output);
    Deno.writeFileSync(outputPath, new Uint8Array(await data.arrayBuffer()), {});
}

async function writeHeader(writer: ZipWriter<Blob>, charRange: number[], renderer: Renderer, config: EjfConfig) {
    const headerData = buildHeader({
        baseline: 13,
        characters: charRange,
        height: renderer.totalHeight,
        spaceWidth: renderer.spaceWidth,
        name: config.name,
    });
    await writer.add("Header", new TextReader(headerData));
}

async function writeCharacters(writer: ZipWriter<Blob>, charRange: number[], renderer: Renderer, progressData: ProgressData) {
    progressData.total = charRange.length;
    for (const char of charRange) {        
        const charFileName = `0x${char.toString(16)}`;
        const renderedChar = renderer.render(char);
        
        const reader = new Uint8ArrayReader(renderedChar); 
        try {
            await writer.add(charFileName, reader);
            await writer.add(`design_${charFileName}`, reader);
            progressData.current++;
        } catch (e: any) {
            throw new GenerationError(`Error while attempting to add ${charFileName} to the ZIP file: ${e.message}`);
        }
    }    
}
