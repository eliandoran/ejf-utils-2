import { parse } from "jsr:@std/toml";
import { EjfConfig } from "./ejf.ts";

export default function parseConfig(path: string): EjfConfig[] {
    const tomlString = Deno.readTextFileSync(path);
    const tomlData = parse(tomlString);
    
    return (tomlData as any).font as EjfConfig[];
}