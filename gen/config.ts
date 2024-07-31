import { parse } from "jsr:@std/toml";
import { EjfConfig } from "./ejf.ts";
import { basename, extname } from "jsr:@std/path@^1.0.0";

export default function parseConfig(path: string): EjfConfig[] {
    const tomlString = Deno.readTextFileSync(path);
    const tomlData = parse(tomlString);
    
    const config = (tomlData as any).font as EjfConfig[];
    for (const ejfConfig of config) {
        ejfConfig.name = basename(ejfConfig.output, extname(ejfConfig.output));
    }

    return config;
}