const [ firstFilePath, secondFilePath ] = Deno.args;
import { ZipReader } from "jsr:@zip-js/zip-js";

async function readArchive(ejfPath: string) {
    const archive = new ZipReader(await Deno.open(firstFilePath));
    const entries = await archive.getEntries();

    for (const entry of entries) {
        if (entry.filename.startsWith("0x")) {
            console.log(entry.filename);
        }
    }
}

readArchive(firstFilePath);