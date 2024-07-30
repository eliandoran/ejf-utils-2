#!/usr/bin/env -S deno run --allow-all
import { printImage } from "https://deno.land/x/terminal_images@3.1.0/mod.ts";
import { BlobWriter, TextWriter } from "jsr:@zip-js/zip-js";
import { Entry } from "jsr:@zip-js/zip-js";
import { ZipReader } from "jsr:@zip-js/zip-js";
import { diff } from "jsr:@libs/diff";

export const DISPLAY_PREVIEWS = false;
interface CharData {
    checksum: number;
    getData: NonNullable<Entry['getData']>;
}

async function readArchive(ejfPath: string) {
    const archive = new ZipReader(await Deno.open(ejfPath));
    const entries = await archive.getEntries();

    const chars = new Map<string, CharData>();
    let header;
    for (const entry of entries) {
        if (entry.filename === "Header") {
            if (!entry.getData) {
                throw new Error("Unable to read header data.");
            }
            
            const writer = new TextWriter();
            await entry.getData(writer)

            header = {
                checksum: entry.signature,
                data: preprocessHeader(await writer.getData())
            };            
            continue;
        }

        if (entry.filename.startsWith("0x")) {         
            if (!entry.getData) {
                throw new Error("Character with missing data function.");
            }

            chars.set(entry.filename, {
                checksum: entry.signature,
                getData: entry.getData
            });
        }
    }

    if (!header) {
        throw new Error("Unable to find EJF header.");
    }
    
    return {
        header,
        chars
    };
}

type EjfData = Awaited<ReturnType<typeof readArchive>>;

function preprocessHeader(ejfHeader: string) {
    return ejfHeader.replace(/\/></g, "/>\n<");
}

function analyzeHeader(firstEjfData: EjfData, secondEjfData: EjfData) {
    const headerDiff = diff(firstEjfData.header.data, secondEjfData.header.data);
    if (firstEjfData.header.data === secondEjfData.header.data) {
        console.log("EJF headers are identical.");
        return;
    }

    console.log(`EJF header contains differences:\n${headerDiff}`);
}

async function findCharacterDifferences(firstEjfData: EjfData, secondEjfData: EjfData) {    
    const firstCharacterSet = new Set<string>(firstEjfData.chars.keys());
    const secondCharacterSet = new Set<string>(secondEjfData.chars.keys());

    // Highlight removed characters.
    const removedCharacters = firstCharacterSet.difference(secondCharacterSet);
    if (removedCharacters.size > 0) {
        console.log("The following characters were removed:");
        console.log(summarizeCharacterChanges(removedCharacters));
    } else {
        console.log("No characters were removed.");
    }

    console.log();

    // Highlight added characters.
    const addedCharacters = secondCharacterSet.difference(firstCharacterSet);
    if (addedCharacters.size > 0) {
        console.log("The following characters were added:");
        console.log(summarizeCharacterChanges(addedCharacters));
    } else {
        console.log("No characters were added.");
    }    
    
    // Highlight changed characters.
    const commonCharacters = firstCharacterSet.intersection(secondCharacterSet);
    const changedCharacters = (Array.from(commonCharacters)).filter((ch) => firstEjfData.chars.get(ch)?.checksum !== secondEjfData.chars.get(ch)?.checksum);
    
    for (const changedChar of changedCharacters) {
        const firstCharData = firstEjfData.chars.get(changedChar);
        const secondCharData = secondEjfData.chars.get(changedChar);

        if (!firstCharData || !secondCharData) {
            throw new Error("Unable to find character data for a character that has changed.");
        }

        await analyzeCharacterChange(firstCharData, secondCharData, changedChar);
    }
}

function summarizeCharacterChanges(characterSet: Set<string>) {
    let result = [];
    for (const char of characterSet) {
        result.push(`0x${(+char).toString(16)} (${String.fromCharCode(+char)})`);
    }
    return result.join(", ");
}

async function previewCharacter(charData: CharData | undefined) {
    if (!DISPLAY_PREVIEWS) {
        return;
    }

    if (!charData) {
        console.warn("Unable to preview character since it could not be found.");
        return;
    }

    const writer = new BlobWriter("image/png");
    await charData.getData(writer);
    await printImage({
        rawFile: new Uint8Array(await (await writer.getData()).arrayBuffer()),
    });
}

async function analyzeCharacterChange(firstCharData: CharData, secondCharData: CharData, ch: string) {
    if (!DISPLAY_PREVIEWS) {
        return;
    }

    const firstWriter = new BlobWriter("image/png");
    const secondWriter = new BlobWriter("image/png");
    
    console.log(`Comparing ${ch}...`);
    
    await firstCharData.getData(firstWriter);
    await secondCharData.getData(secondWriter);
    
    printImage({
        rawFile: new Uint8Array(await (await firstWriter.getData()).arrayBuffer()),
    });

    printImage({
        rawFile: new Uint8Array(await (await secondWriter.getData()).arrayBuffer())
    });
}

let beforeFilePath;
let afterFilePath;
if (Deno.args.length === 7) {
    // 7 arguments means that the tool was called through Git. We also display the file name for convenience.
    const [ path, oldFile, oldHex, oldMode, newFile, newHex, newMode ] = Deno.args;
    console.log(`\nejf-diff ${path}`);
    beforeFilePath = oldFile;
    afterFilePath = newFile;    
} else {
    const [ oldFile, newFile ] = Deno.args;
    beforeFilePath = oldFile;
    afterFilePath = newFile;
}


const firstEjfData = await readArchive(beforeFilePath);
const secondEjfData = await readArchive(afterFilePath);
await analyzeHeader(firstEjfData, secondEjfData);
await findCharacterDifferences(firstEjfData, secondEjfData);