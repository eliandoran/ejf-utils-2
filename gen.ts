import { encode } from "https://deno.land/x/pngs/mod.ts";
import freetype from "npm:freetype2";

const ttfPath = Deno.args[0];

const DPI = 72;
const size = 32;

const face = freetype.NewFace(ttfPath);
face.setCharSize(size, 0, DPI, 0)

const glyph = face.loadChar("A".charCodeAt(0), {
    render: true
});

function monochromeImageBufferToColorImageBuffer(inputBuffer: Uint8Array) {
    const outputBuffer = new Uint8Array(4 * inputBuffer.length);
    for (let i=0; i<inputBuffer.length; i++) {
        outputBuffer[4 * i] = 255 - inputBuffer[i];
        outputBuffer[4 * i + 1] = 255 - inputBuffer[i];
        outputBuffer[4 * i + 2] = 255 - inputBuffer[i];
        outputBuffer[4 * i + 3] = 255;
    }

    return outputBuffer;
}

function buildPng(colorImageBuffer: Uint8Array) {
    const width = 23;
    const numPixels = colorImageBuffer.length / 4;

    console.log("Image size is ", colorImageBuffer.length);
    return encode(colorImageBuffer, width, numPixels / width);    
}

const colorImageBuffer = monochromeImageBufferToColorImageBuffer(Uint8Array.from(glyph.bitmap?.buffer));
const png = buildPng(colorImageBuffer);

Deno.writeFileSync("glyph.png", png);