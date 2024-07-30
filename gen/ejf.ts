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
    add_null_characters: boolean;
}

export default async function buildEjf(config: EjfConfig, workingDir: string) {
    const charRange = parseCharRange(config.char_range);    
    const ttfPath = resolve(workingDir, config.input);
    const renderer = new Renderer(ttfPath, config.size);
    
    const blobWriter = new BlobWriter("application/zip");
    const writer = new ZipWriter(blobWriter);

    // Write the header
    await writeHeader(writer, charRange, renderer, config);

    // Render each character.
    await writeCharacters(writer, charRange, renderer);

    await writer.close();
    
    console.time("write");
    const data = await blobWriter.getData();
    const outputPath = join(workingDir, config.output);
    Deno.writeFileSync(outputPath, new Uint8Array(await data.arrayBuffer()), {});
    console.timeEnd("write");
}

async function writeHeader(writer: ZipWriter<Blob>, charRange: number[], renderer: Renderer, config: EjfConfig) {
    console.time("header");
    const headerData = buildHeader({
        baseline: 13,
        characters: charRange,
        height: renderer.totalHeight,
        spaceWidth: renderer.spaceWidth,
        name: basename(config.output, extname(config.output)),
    });
    await writer.add("Header", new TextReader(headerData));
    console.timeEnd("header");
}

async function writeCharacters(writer: ZipWriter<Blob>, charRange: number[], renderer: Renderer) {
    console.time("render-all")
    for (const char of charRange) {        
        const charFileName = `0x${char.toString(16)}.png`;
        const renderedChar = renderer.render(char);
        
        const reader = new Uint8ArrayReader(renderedChar); 
        try {
            await writer.add(charFileName, reader);
        } catch (e: any) {
            throw new GenerationError(`Error while attempting to add ${charFileName} to the ZIP file: ${e.message}`);
        }
        await writer.add(`design_${charFileName}`, reader);
    }
    console.timeEnd("render-all");
}
