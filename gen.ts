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
    const leftSpacing = glyph.metrics.horiBearingX / 64;
    const rightSpacing = (glyph.metrics.horiAdvance - glyph.metrics.horiBearingX - glyph.metrics.width) / 64;    

    const inputImageWidth = (glyph.metrics.width / 64);
    const imageWidth = leftSpacing + inputImageWidth + rightSpacing;
    const imageHeight = glyph.metrics.height / 64;

    const numPixels = (imageWidth * imageHeight * 4);

    const outputBuffer = new Uint8Array(numPixels).fill(255);

    for (let y = 0; y < imageHeight; y++) {
        for (let x = 0; x < inputImageWidth; x++) {
            const srcPos = (y * inputImageWidth) + x;
            const destPos = leftSpacing + (y * imageWidth) + x;
            outputBuffer[4 * destPos] = 255 - inputBuffer[srcPos];
            outputBuffer[4 * destPos + 1] = 255 - inputBuffer[srcPos];
            outputBuffer[4 * destPos + 2] = 255 - inputBuffer[srcPos];
            outputBuffer[4 * destPos + 3] = 255;
        }
    }

    return {
        buffer: outputBuffer,
        imageWidth,
        imageHeight
    };
}

function buildPng(colorImageBuffer: ReturnType<typeof monochromeImageBufferToColorImageBuffer>) {    
    return encode(colorImageBuffer.buffer, colorImageBuffer.imageWidth, colorImageBuffer.imageHeight);
}

const glyph = renderCharacter("A");
const colorImageBuffer = monochromeImageBufferToColorImageBuffer(glyph, Uint8Array.from(glyph.bitmap?.buffer));
const png = buildPng(colorImageBuffer);

Deno.writeFileSync("glyph.png", png);