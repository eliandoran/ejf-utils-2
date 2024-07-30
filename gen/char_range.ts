import { EjfConfig } from "./ejf.ts";
import unicode from "https://deno.land/x/unicode/mod.ts";

export default function parseCharRange(config: EjfConfig) {        
    const charRange = getRawRange(config.char_range);
    const ignoreCharRange = getRawRange(config.ignore_char_range);

    const filtered = charRange.filter((ch) => {
        if (ch === 0x20) {
            // The space character is ignored as per the original implementation. This is due to the fact
            // that it's a redundant character since it's supported natively by spaceWidth inside the header.
            return false;
        }

        // Ignore control characters.
        if (config?.skip_control_characters && unicode[ ch]?.category === "Cc") {
            return false;
        }

        return true;
    });

    let charSet = new Set(filtered);
    if (config?.add_null_character) {
        charSet.add(0);
    }

    // Remove all the ignored characters.
    charSet = charSet.difference(new Set(ignoreCharRange));

    // Remove duplicate characters.
    return Array.from(charSet);
}

function getRawRange(charRange: string) {
    const components = charRange
        .replace(/;/g, ",")
        .replace(/\s*/g, "")
        .split(",");

    const result = [];
    for (const component of components) {
        const rangeComponents = component.split("-");
        if (rangeComponents.length > 2) {
            throw new Error(`Invalid range encountered: ${component}`);
        }

        const start = parseInt(rangeComponents[0], 16);
        const end = parseInt(rangeComponents[1], 16);
        if (!Number.isNaN(end)) {
            // Range
            for (let ch=start; ch<end; ch++) {
                result.push(ch);
            }
        } else {
            // Single char
            result.push(start);
        }
    }
    return result;
}