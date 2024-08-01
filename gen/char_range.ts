import unicode from "https://deno.land/x/unicode/mod.ts";
import { EjfConfig } from "./config.ts";

export default function parseCharRange(config: EjfConfig) {        
    const charRange = getRawRange(config.charRange);
    const ignoreCharRange = getRawRange(config.ignoreCharRange);

    const filtered = charRange.filter((ch) => {
        if (ch === 0x20) {
            // The space character is ignored as per the original implementation. This is due to the fact
            // that it's a redundant character since it's supported natively by spaceWidth inside the header.
            return false;
        }

        // Ignore control characters.
        if (config?.skipControlCharacters && unicode[ ch]?.category === "Cc") {
            return false;
        }

        return true;
    });

    let charSet = new Set<number>(filtered);
    if (config?.addNullCharacter) {
        charSet.add(0);
    }

    if (config.ensureString) {
        charSet = charSet.union(getRangeFromEnsureString(config.ensureString));
    }

    // Remove all the ignored characters.
    charSet = charSet.difference(new Set(ignoreCharRange));

    // Remove duplicate characters.
    return Array.from(charSet).toSorted((a, b) => a-b);
}

function getRangeFromEnsureString(string: string) {
    return new Set(string
        .split("")
        .map((ch) => ch.charCodeAt(0)));
}

function getRawRange(charRange: string) {
    if (!charRange) {
        return [];
    }

    const components = charRange
        .replace(/;/g, ",")
        .replace(/\s*/g, "")
        .split(",");

    const result: number[] = [];
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