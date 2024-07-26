const [ pathToPo ] = Deno.args;

function processPoFile(path: string){
    const poFile =  Deno.readTextFileSync(path).split("");
    const charSet = new Set<string> (poFile);
    console.log(charSet)
}

processPoFile(pathToPo)