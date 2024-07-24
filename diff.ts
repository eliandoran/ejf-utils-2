const [ firstFilePath, secondFilePath ] = Deno.args;
import { ZipReader } from "jsr:@zip-js/zip-js";

interface EjfData {
    characterChecksums: Map<string, number>;
}

async function readArchive(ejfPath: string): Promise<EjfData> {
    const archive = new ZipReader(await Deno.open(ejfPath));
    const entries = await archive.getEntries();

    const characterChecksums = new Map<string, number>();
    for (const entry of entries) {
        if (entry.filename.startsWith("0x")) {           
            characterChecksums.set(entry.filename, entry.signature);
        }
    }

    return {
        characterChecksums
    };
}

function findCharacterDifferences(firstEjfData: EjfData, secondEjfData: EjfData) {    
    const firstCharacterSet = new Set<string>(firstEjfData.characterChecksums.keys());
    const secondCharacterSet = new Set<string>(secondEjfData.characterChecksums.keys());

    // Highlight removed characters.
    const removedCharacters = secondCharacterSet.difference(firstCharacterSet);
    for (const removedChar of removedCharacters) {
        console.log(`-${removedChar}`);
    }
}

const firstEjfData = await readArchive(firstFilePath);
const secondEjfData = await readArchive(secondFilePath);
findCharacterDifferences(firstEjfData, secondEjfData);