import freetype from "npm:freetype2";

const ttfPath = Deno.args[0];

const DPI = 72;
const size = 32;

const face = freetype.NewFace(ttfPath);
face.setCharSize(size, 0, DPI, 0)

const glyph = face.loadChar("A".charCodeAt(0), {
    render: true
});

Deno.writeFileSync("glyph", glyph.bitmap?.buffer);