import Renderer from "./renderer.ts";

const ttfPath = Deno.args[0];

const renderer = new Renderer(ttfPath, 40);
Deno.writeFileSync("glyph.png", renderer.render("A"));