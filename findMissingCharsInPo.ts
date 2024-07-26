import getText from "npm:gettext-parser@8.0.0";
const [ pathToPo ] = Deno.args;

interface Message {
    msgid: string;
    comments: Record<string, unknown>;
    msgstr: string[]
}

function processPoFile(path: string){
    const poFile =  Deno.readTextFileSync(path);
    const charSet = new Set<string> (poFile);
    const po = getText.po.parse(poFile)
        .translations[""] as Record<string, Message>;
    delete po[""];
    
    const parsedPo = Object.values(po)
        .map(el => el.msgstr[0]);

    console.log(parsedPo)
}

processPoFile(pathToPo)