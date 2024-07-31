import { parse } from "jsr:@std/toml";
import { EjfConfig } from "./ejf.ts";
import { basename, extname } from "jsr:@std/path@^1.0.0";

export default function parseConfig(path: string): EjfConfig[] {
    const configString = Deno.readTextFileSync(path);
    const config = parseToml(configString) as EjfConfig[];    
    for (const ejfConfig of config) {
        ejfConfig.name = basename(ejfConfig.output, extname(ejfConfig.output));
    }

    return config;
}

function parseToml(configString: string) {    
    const tomlData = parse(configString);
    const config: Omit<EjfConfig, "name">[] = [];

    if (!("font" in tomlData) || !Array.isArray(tomlData.font)) {
        throw new Error("Unable to parse TOML config because it's missing [[font]].")
    }

    for (const readConfig of tomlData.font) {
        config.push({
            charRange: readConfig.char_range,
            ignoreCharRange: readConfig.ignore_char_range,
            input: readConfig.input,
            output: readConfig.output,
            size: readConfig.size,
            skipControlCharacters: readConfig.skip_control_characters,
            addNullCharacter: readConfig.add_null_character
        })
    }
    
    return config;
}
