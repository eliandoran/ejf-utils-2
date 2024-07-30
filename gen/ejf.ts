import { BlobWriter, TextReader, Uint8ArrayReader, ZipWriter } from "jsr:@zip-js/zip-js";
import parseCharRange from "./char_range.ts";
import Renderer from "./renderer.ts";
import buildHeader from "./header.ts";
import { basename, extname, join, resolve } from "jsr:@std/path@^1.0.0";
import GenerationError from "./errors.ts";

export interface EjfConfig {
    char_range: string;
    ignore_char_range: string;
    input: string;
    output: string;
    size: number;
    skip_control_characters: boolean;
    add_null_character: boolean;
}

export interface ProgressData {
    current: number,
    total: number
}

export default async function buildEjf(config: EjfConfig, workingDir: string, progressData: ProgressData) {
    const charRange = parseCharRange(config);    
    const ttfPath = resolve(workingDir, config.input);
    const renderer = new Renderer(ttfPath, config.size);
    
    const blobWriter = new BlobWriter("application/zip");
    const date = new Date(0);
    const writer = new ZipWriter(blobWriter, {
        // No compression to speed up writing time but also since PNGs generally don't compress that well.
        level: 0,

        // We set a neutral timestamp to avoid the creation date changing the ZIP.
        creationDate: date,
        lastModDate: date
    });

    // Write the header
    await writeHeader(writer, charRange, renderer, config);

    // Render each character.
    await writeCharacters(writer, charRange, renderer, progressData);

    await writer.close();
    
    const data = await blobWriter.getData();
    const outputPath = join(workingDir, config.output);
    Deno.writeFileSync(outputPath, new Uint8Array(await data.arrayBuffer()), {});
}

async function writeHeader(writer: ZipWriter<Blob>, charRange: number[], renderer: Renderer, config: EjfConfig) {
    const headerData = buildHeader({
        baseline: 13,
        characters: charRange,
        height: renderer.totalHeight,
        spaceWidth: renderer.spaceWidth,
        name: basename(config.output, extname(config.output)),
    });
    await writer.add("Header", new TextReader(headerData));
}

async function writeCharacters(writer: ZipWriter<Blob>, charRange: number[], renderer: Renderer, progressData: ProgressData) {
    const promises = [];

    progressData.total = charRange.length;
    for (const char of charRange) {        
        const charFileName = `0x${char.toString(16)}`;
        const renderedChar = renderer.render(char);
        
        const reader = new Uint8ArrayReader(renderedChar); 
        try {
            promises.push(writer.add(charFileName, reader).then(() => {
                progressData.current++;
            }));
        } catch (e: any) {
            throw new GenerationError(`Error while attempting to add ${charFileName} to the ZIP file: ${e.message}`);
        }
        await writer.add(`design_${charFileName}`, reader);
    }
    
    await Promise.all(promises);
}
