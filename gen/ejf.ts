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

export default async function buildEjf(fullConfig: EjfConfig | EjfConfig[], workingDir: string, progressData: ProgressData) {    

    const { height, fullCharRange, configs } = buildIndividualConfiguration(fullConfig, workingDir);
    progressData.height = height;
    progressData.total = fullCharRange.length;
    
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
    let isFirstConfig = true;
    for (const { charRange, renderer } of configs) {
        await writeCharacters(writer, charRange, renderer, progressData, isFirstConfig);
        isFirstConfig = false;
    }

    // Write the header
    const mainConfig = configs[0];
    await writeHeader(writer, fullCharRange, mainConfig.renderer, mainConfig.ejfConfig);

    await writer.close();
    
    const data = await blobWriter.getData();
    const outputPath = join(workingDir, mainConfig.ejfConfig.outputDir || "", mainConfig.ejfConfig.output);
    Deno.writeFileSync(outputPath, new Uint8Array(await data.arrayBuffer()), {});
}

function buildIndividualConfiguration(fullConfig: EjfConfig | EjfConfig[], workingDir: string) {
    const configs = (Array.isArray(fullConfig) ? fullConfig : [ fullConfig ]);
    const output = [];
    let minHeight = Number.MAX_SAFE_INTEGER;
    let maxHeight = Number.MIN_SAFE_INTEGER;

    for (const config of configs) {
        if (!config.input) {
            throw new GenerationError("Missing path to input file.", config);
        }

        const ttfPath = resolve(workingDir, config.input);
        const renderer = new Renderer(ttfPath, config.size);
        const height = renderer.totalHeight;
        const charRange = parseCharRange(config);

        if (!charRange.length) {
            throw new GenerationError(`The font ${configs[0].name} has no characters.`);
        }

        minHeight = Math.min(minHeight, height);
        maxHeight = Math.max(maxHeight, height);

        output.push({
            renderer,
            charRange,
            height,
            ejfConfig: config
        });
    }

    if (minHeight !== maxHeight) {
        throw new GenerationError(`Composite font with name "${configs[0].name}" has configurations with different font heights (${minHeight} vs ${maxHeight}). This is not supported, all sub-configurations must render to the same height.`);
    }

    return {
        configs: output,
        height: maxHeight,
        /** The combined char range of all the individual configurations. */
        fullCharRange: Array.from(new Set(output.map((config) => config.charRange).flat()))
    };
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

async function writeCharacters(writer: ZipWriter<Blob>, charRange: number[], renderer: Renderer, progressData: ProgressData, isFirstConfig: boolean) {    
    for (const char of charRange) {        
        if (char === 0 && !isFirstConfig) {
            // The NULL character needs to be embedded only once in composite fonts.
            continue;
        }

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
