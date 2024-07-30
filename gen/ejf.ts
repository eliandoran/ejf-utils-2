import { BlobWriter, TextReader, Uint8ArrayReader, ZipWriter } from "jsr:@zip-js/zip-js";
import parseCharRange from "./char_range.ts";
import Renderer from "./renderer.ts";
import buildHeader from "./header.ts";
import { basename, extname } from "jsr:@std/path@^1.0.0";

export interface EjfConfig {
    char_range: string;
    ignore_char_range: string;
    input: string;
    output: string;
    size: number;
    skip_control_characters: boolean;
    add_null_characters: boolean;
}

export default async function buildEjf(config: EjfConfig) {
    const charRange = parseCharRange(config.char_range);
    const renderer = new Renderer(config.input, config.size);
    
    const blobWriter = new BlobWriter("application/zip");
    const writer = new ZipWriter(blobWriter);

    // Write the header
    writeHeader(writer, charRange, renderer, config);

    // Render each character.
    writeCharacters(writer, charRange, renderer);

    await writer.close();
    
    console.time("write");
    const data = await blobWriter.getData();
    Deno.writeFileSync(config.output, data);
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
    console.time("render-zip")
    for (const char of charRange) {        
        const charFileName = `0x${char.toString(16)}.png`;
        const renderedChar = renderer.render(char);
        
        const reader = new Uint8ArrayReader(renderedChar);        
        await writer.add(charFileName, reader);
        await writer.add(`design_${charFileName}`, reader);
    }
    console.timeEnd("render-zip");
}
