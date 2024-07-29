import { encode } from "https://deno.land/x/pngs/mod.ts";
import freetype from "npm:freetype2";

const ttfPath = Deno.args[0];

const DPI = 72;
const size = 40;

const face = freetype.NewFace(ttfPath);
const charWidth = size;
face.setCharSize(charWidth, 0, DPI, 0);

function renderCharacter(char: string) {
    return face.loadChar(char.charCodeAt(0), {
        render: true
    });
}

function monochromeImageBufferToColorImageBuffer(glyph: freetype.Glyph, inputBuffer: Uint8Array) {
    const imageWidth = glyph.metrics.width / 64;
    const imageHeight = glyph.metrics.height / 64;
    const numPixels = (imageWidth * imageHeight * 4);

    const outputBuffer = new Uint8Array(numPixels);
    for (let i=0; i<inputBuffer.length; i++) {
        outputBuffer[4 * i] = 255 - inputBuffer[i];
        outputBuffer[4 * i + 1] = 255 - inputBuffer[i];
        outputBuffer[4 * i + 2] = 255 - inputBuffer[i];
        outputBuffer[4 * i + 3] = 255;
    }

    return outputBuffer;
}

function buildPng(glyph, colorImageBuffer: Uint8Array) {
    const numPixels = colorImageBuffer.length / 4;
    const width = glyph.metrics.width / 64;
    console.log(glyph.metrics);

    console.log("Image size is ", colorImageBuffer.length);
    return encode(colorImageBuffer, width, numPixels / width);    
}

const glyph = renderCharacter("A");
const colorImageBuffer = monochromeImageBufferToColorImageBuffer(glyph, Uint8Array.from(glyph.bitmap?.buffer));
const png = buildPng(glyph, colorImageBuffer);

Deno.writeFileSync("glyph.png", png);