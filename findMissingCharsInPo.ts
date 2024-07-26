import getText from "npm:gettext-parser@8.0.0";
import { ZipReader } from "jsr:@zip-js/zip-js";
import { Entry } from "jsr:@zip-js/zip-js";

const [ pathToPo, ejfFilePath] = Deno.args;
console.log(pathToPo)
console.log(ejfFilePath)

interface Message {
    msgid: string;
    comments: Record<string, unknown>;
    msgstr: string[]
}

function processPoFile(path: string){
    const poFile =  Deno.readTextFileSync(path);
    const po = getText.po.parse(poFile)
        .translations[""] as Record<string, Message>;
    delete po[""];
    
    const parsedPo = new Set<string>( Object.values(po)
        .map(el => el.msgstr[0])
        .join("")
        .split("")
        .map(char => "0x" + char.charCodeAt(0).toString(16))
    );

    return parsedPo;
}

interface CharData {
    checksum: number;
    getData: NonNullable<Entry['getData']>;
}

async function readEjfFile(ejfPath: string) {
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

type EjfData = Awaited<ReturnType<typeof readEjfFile>>;

async function findCharsDifferences() {
    const poFile = processPoFile(pathToPo);
    const ejfData = await readEjfFile(ejfFilePath);
    const ejfFile = new Set<string>(ejfData.chars.keys());

    const missingChars = Array.from(poFile.difference(ejfFile)).toSorted(
        (a: string, b: string) => parseInt(a, 16) - parseInt(b, 16));

    console.log(missingChars)
}

findCharsDifferences();
