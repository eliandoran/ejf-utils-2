import { parse } from "jsr:@std/toml";
import { basename, extname } from "jsr:@std/path@^1.0.0";
import GenerationError from "./errors.ts";

export interface Config {
    fonts: (EjfConfig | EjfConfig[])[];
}

export interface EjfConfig {
    name: string;
    charRange: string;
    ensureString?: string;
    ignoreCharRange: string;
    input: string;
    output: string;
    outputDir?: string;
    size: number;
    skipControlCharacters: boolean;
    skipUnsupportedCharacters: boolean;
    addNullCharacter: boolean;
}

interface JsonEjfConfig extends EjfConfig {
    template: string;
}

export default function parseConfig(path: string): Config {
    const configString = Deno.readTextFileSync(path);
    let config: Config;
    
    if (extname(path) === ".toml") {
        config = parseToml(configString);
    } else if (extname(path) === ".json") {
        config = parseJson(configString);
    } else {
        throw new Error("Unable to determine the format of the configuration file.");
    }

    for (const ejfConfig of config.fonts) {
        const subConfig = Array.isArray(ejfConfig) ? ejfConfig[0] : ejfConfig;
        subConfig.name = basename(subConfig.output, extname(subConfig.output));
    }

    return config;
}

function parseJson(configString: string): Config {
    const data = JSON.parse(configString);
    
    const fonts: (EjfConfig | EjfConfig[])[] = [];
    const sharedSettings = data.sharedFontSettings || {};
    const templates: Record<string, object> = data.templates;
    for (const [ name, font ] of Object.entries(data.fonts as Record<string, JsonEjfConfig | JsonEjfConfig[]>)) {
        const subConfigs = Array.isArray(font) ? font : [ font ];
        const processedSubConfigs: JsonEjfConfig[] = [];

        for (const subConfig of subConfigs) {
            let templateData = {};
            if (subConfig.template) {
                const template = templates[subConfig.template];
                if (!template) {
                    throw new GenerationError(`Template ${subConfig.template} not found`, font);
                }
                templateData = template;
            }

            processedSubConfigs.push({
                ...sharedSettings,
                ...templateData,
                ...subConfig,
                output: `${name}.ejf`
            });
        }

        fonts.push(processedSubConfigs);
    }

    return { fonts };
}

function parseToml(configString: string) {    
    const tomlData = parse(configString);
    const fonts: EjfConfig[] = [];

    if (!("font" in tomlData) || !Array.isArray(tomlData.font)) {
        throw new Error("Unable to parse TOML config because it's missing [[font]].")
    }

    for (const readConfig of tomlData.font) {
        fonts.push({
            // Calculated afterwards.
            name: "",

            charRange: readConfig.char_range,
            ignoreCharRange: readConfig.ignore_char_range,
            input: readConfig.input,
            output: readConfig.output,
            size: readConfig.size,
            skipControlCharacters: readConfig.skip_control_characters,
            addNullCharacter: readConfig.add_null_character
        })
    }
    
    return { fonts };
}
