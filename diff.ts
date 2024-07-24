const [ firstFilePath, secondFilePath ] = Deno.args;
import { printImage } from "https://deno.land/x/terminal_images@3.1.0/mod.ts";
import { BlobWriter } from "jsr:@zip-js/zip-js";
import { Entry } from "jsr:@zip-js/zip-js";
import { ZipReader } from "jsr:@zip-js/zip-js";

interface CharData {
    checksum: number;
    getData: NonNullable<Entry['getData']>;
}

async function readArchive(ejfPath: string) {
    const archive = new ZipReader(await Deno.open(ejfPath));
    const entries = await archive.getEntries();

    const chars = new Map<string, CharData>();
    for (const entry of entries) {
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
    
    return {
        chars
    };
}

type EjfData = Awaited<ReturnType<typeof readArchive>>;

async function findCharacterDifferences(firstEjfData: EjfData, secondEjfData: EjfData) {    
    const firstCharacterSet = new Set<string>(firstEjfData.chars.keys());
    const secondCharacterSet = new Set<string>(secondEjfData.chars.keys());

    // Highlight removed characters.
    const removedCharacters = firstCharacterSet.difference(secondCharacterSet);
    for (const removedChar of removedCharacters) {
        console.log(`-${removedChar}`);
    }

    // Highlight added characters.
    const addedCharacters = secondCharacterSet.difference(firstCharacterSet);
    for (const addedChar of addedCharacters) {
        console.log(`+${addedChar}`);
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

async function analyzeCharacterChange(firstCharData: CharData, secondCharData: CharData, ch: string) {
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

const firstEjfData = await readArchive(firstFilePath);
const secondEjfData = await readArchive(secondFilePath);
await findCharacterDifferences(firstEjfData, secondEjfData);