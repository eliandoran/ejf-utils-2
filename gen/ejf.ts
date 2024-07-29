import { BlobWriter, Uint8ArrayReader, Writer, ZipWriter } from "jsr:@zip-js/zip-js";
import parseCharRange from "./char_range.ts";
import Renderer from "./renderer.ts";

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
