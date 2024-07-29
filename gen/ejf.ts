import { BlobWriter, TextReader, TextWriter, Uint8ArrayReader, ZipWriter } from "jsr:@zip-js/zip-js";
import parseCharRange from "./char_range.ts";
import Renderer from "./renderer.ts";
import buildHeader from "./header.ts";
import { basename, extname } from "jsr:@std/path@0.224.0";

interface EjfConfig {
    ttfPath: string;
    outputPath: string;
    size: number;
    charRange: string;
}

export default async function buildEjf(config: EjfConfig) {
    const { ttfPath, size } = config;
    const charRange = parseCharRange(config.charRange);
    const renderer = new Renderer(ttfPath, size);
    
    const blobWriter = new BlobWriter("application/zip");
    const writer = new ZipWriter(blobWriter);

    // Write the header
    writeHeader(writer, charRange, renderer, config);

    // Render each character.
    writeCharacters(writer, charRange, renderer);

    await writer.close();
    
    console.time("write");
    const data = await blobWriter.getData();
    Deno.writeFileSync(config.outputPath, await data.bytes());
    console.timeEnd("write");
}

async function writeHeader(writer: ZipWriter<Blob>, charRange: number[], renderer: Renderer, config: EjfConfig) {
    console.time("header");
    const headerData = buildHeader({
        baseline: 13,
        characters: charRange,
        height: renderer.totalHeight,
        spaceWidth: renderer.spaceWidth,
        name: basename(config.outputPath, extname(config.outputPath)),
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
