import parseCharRange from "./char_range.ts";

interface EjfConfig {
    charRange: string;
}

export default function buildEjf(config: EjfConfig) {
    const charRange = parseCharRange(config.charRange);
    console.log(charRange.map((e) => e.toString(16)));
}
