import { encode } from "https://deno.land/x/pngs/mod.ts";
import {existsSync} from "https://deno.land/std/fs/mod.ts";
import freetype, { Glyph } from "npm:freetype2";
import GenerationError from "./errors.ts";

const DPI = 72;
const STRICT = false;

export default class Renderer {

    private face: freetype.FontFace;
    private ascender: number;
    totalHeight: number;
    spaceWidth: number;

    constructor(ttfPath: string, size: number) {
        const face = this.getFont(ttfPath);
        const charWidth = size;
        face.setCharSize(charWidth, 0, DPI, 0);
        this.face = face;

        const properties = this.face.properties();
        const yScale = properties.size.yScale / 65536;
        this.ascender = Math.floor(properties.ascender * yScale) / 64;
        const descender = -Math.floor(properties.descender * yScale) / 64;    
        this.totalHeight = Math.floor(this.ascender + descender);
        this.spaceWidth = this.getMetrics(this.getGlyph(32)).widthWithSpacing;
    }

    render(charCode: number) {
        const glyph = this.getGlyph(charCode);
        const { leftSpacing, glyphWidth, glyphHeight, widthWithSpacing } = this.getMetrics(glyph);
        const numPixels = (widthWithSpacing * this.totalHeight * 4);
    
        if (!glyph.bitmap && STRICT) {
            throw new GenerationError(`Unable to render character with code 0x${charCode.toString(16)} (${String.fromCharCode(charCode)}).`);
        }

        if (widthWithSpacing === 0) {
            throw new GenerationError(`Encountered zero width while attempting to render character 0x${charCode.toString(16)} (${String.fromCharCode(charCode)}) `, this.getMetrics(glyph));
        }

        const outputBuffer = new Uint8Array(numPixels).fill(255);
        
        if (glyph.bitmap) {
            const yOffset = Math.floor(this.ascender - (glyph.bitmapTop || 0));
            const inputBuffer = Uint8Array.from(glyph.bitmap.buffer);
            for (let y = 0; y < glyphHeight; y++) {
                for (let x = 0; x < glyphWidth; x++) {
                    const srcPos = (y * glyphWidth) + x;
                    const destPos = leftSpacing + ((y + yOffset) * widthWithSpacing) + x;
                    outputBuffer[4 * destPos] = 255 - inputBuffer[srcPos];
                    outputBuffer[4 * destPos + 1] = 255 - inputBuffer[srcPos];
                    outputBuffer[4 * destPos + 2] = 255 - inputBuffer[srcPos];
                    outputBuffer[4 * destPos + 3] = 255;
                }
            }
        }

        return encode(outputBuffer, widthWithSpacing, this.totalHeight);
    }

    private getFont(ttfPath: string) {
        if (!existsSync(ttfPath)) {
            throw new GenerationError(`Unable to find the font located at "${ttfPath}". If you are using relative paths make sure that the file is correct relative to the location of the configuration file.`);
        }

        try {
            return freetype.NewFace(ttfPath);
        } catch (e) {
            throw new GenerationError("The font could not be loaded.");
        }
    }

    private getGlyph(charCode: number): Glyph {
        return this.face.loadChar(charCode, {
            render: true
        }); 
    }

    private getMetrics(glyph: Glyph) {
        // Some characters can have negative spacing, which is not supported by the MicroEJ engine so we ignore it.
        const leftSpacing = Math.max(0, glyph.metrics.horiBearingX / 64);
        const rightSpacing = Math.max(0, (glyph.metrics.horiAdvance - glyph.metrics.horiBearingX - glyph.metrics.width) / 64);
        const glyphWidth = (glyph.metrics.width / 64);
    
        return {
            leftSpacing,
            rightSpacing,
            glyphWidth,
            glyphHeight: (glyph.metrics.height / 64),
            widthWithSpacing: (leftSpacing + glyphWidth + rightSpacing)
        }
    }

}