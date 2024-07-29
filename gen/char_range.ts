export default function parseCharRange(charRange: string) {
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