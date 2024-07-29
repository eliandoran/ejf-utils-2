import { BlobWriter, Uint8ArrayReader, ZipWriter } from "jsr:@zip-js/zip-js";
import parseCharRange from "./char_range.ts";
import Renderer from "./renderer.ts";
import { HeaderInfo } from "./header.ts";
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
    console.time("header");
    const info: HeaderInfo = {
        baseline: 13,
        characters: charRange,
        height: renderer.totalHeight,
        spaceWidth: renderer.spaceWidth,
        name: basename(config.outputPath, extname(config.outputPath)),
    };
    console.log(info);
    console.timeEnd("header");

    // Render each character.
    console.time("render-zip")
    for (const char of charRange) {        
        const charFileName = `0x${char.toString(16)}.png`;
        const renderedChar = renderer.render(char);
        
        const reader = new Uint8ArrayReader(renderedChar);        
        await writer.add(charFileName, reader);
        await writer.add(`design_${charFileName}`, reader);
    }
    console.timeEnd("render-zip");

    await writer.close();
    
    console.time("write");
    const data = await blobWriter.getData();
    Deno.writeFileSync(config.outputPath, await data.bytes());
    console.timeEnd("write");
}
