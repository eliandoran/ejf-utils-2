import buildEjf from "./ejf.ts";
import Renderer from "./renderer.ts";

const ttfPath = Deno.args[0];

//const renderer = new Renderer(ttfPath, 40);
//Deno.writeFileSync("glyph.png", renderer.render("A"));

buildEjf({
    charRange: "0x2d,0x30-0x3b,0x41-0x5b,0x61-0x7a"
})