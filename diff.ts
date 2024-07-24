const [ firstFilePath, secondFilePath ] = Deno.args;
import { ZipReader } from "jsr:@zip-js/zip-js";

async function readArchive(ejfPath: string) {
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

const firstEjfData = await readArchive(firstFilePath);
const secondEjfData = await readArchive(secondFilePath);

console.log(firstEjfData);