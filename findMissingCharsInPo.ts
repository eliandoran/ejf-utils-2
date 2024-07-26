import getText from "npm:gettext-parser@8.0.0";
const [ pathToPo ] = Deno.args;

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
        .split(""));

    console.log(parsedPo)
}

processPoFile(pathToPo)