import { encode } from "https://deno.land/x/pngs/mod.ts";
import freetype from "npm:freetype2";

const DPI = 72;

export default class Renderer {

    private face: freetype.FontFace;
    private ascender: number;
    private totalHeight: number;

    constructor(ttfPath: string, size: number) {
        const face = freetype.NewFace(ttfPath);
        const charWidth = size;
        face.setCharSize(charWidth, 0, DPI, 0);
        this.face = face;

        const properties = this.face.properties();
        const yScale = properties.size.yScale / 65536;
        this.ascender = Math.floor(properties.ascender * yScale) / 64;
        const descender = -Math.floor(properties.descender * yScale) / 64;    
        this.totalHeight = Math.floor(this.ascender + descender)
    }

    render(char: string) {
        const glyph = this.renderCharacter(char);
        return this.monochromeImageBufferToColorImageBuffer(glyph, Uint8Array.from(glyph.bitmap?.buffer));
    }

    renderCharacter(char: string) {
        return this.face.loadChar(char.charCodeAt(0), {
            render: true
        });
    }
    
    monochromeImageBufferToColorImageBuffer(glyph: freetype.Glyph, inputBuffer: Uint8Array) {
        const leftSpacing = glyph.metrics.horiBearingX / 64;
        const rightSpacing = (glyph.metrics.horiAdvance - glyph.metrics.horiBearingX - glyph.metrics.width) / 64;    
    
        const inputImageWidth = (glyph.metrics.width / 64);
        const imageWidth = leftSpacing + inputImageWidth + rightSpacing;
        const glyphHeight = glyph.metrics.height / 64;
    
        const numPixels = (imageWidth * this.totalHeight * 4);
    
        const outputBuffer = new Uint8Array(numPixels).fill(255);
        const yOffset = Math.floor(this.ascender - (glyph.bitmapTop || 0));
    
        for (let y = 0; y < glyphHeight; y++) {
            for (let x = 0; x < inputImageWidth; x++) {
                const srcPos = (y * inputImageWidth) + x;
                const destPos = leftSpacing + ((y + yOffset) * imageWidth) + x;
                outputBuffer[4 * destPos] = 255 - inputBuffer[srcPos];
                outputBuffer[4 * destPos + 1] = 255 - inputBuffer[srcPos];
                outputBuffer[4 * destPos + 2] = 255 - inputBuffer[srcPos];
                outputBuffer[4 * destPos + 3] = 255;
            }
        }
    
        return encode(outputBuffer, imageWidth, this.totalHeight);
    }

}