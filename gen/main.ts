import parseConfig from "./config.ts";
import buildEjf from "./ejf.ts";
import GenerationError from "./errors.ts";
import { dirname } from "jsr:@std/path@^1.0.0";

const configPath = Deno.args[0];

async function main() {
    if (!configPath) {
        console.error("Missing config path.");
        return;
    }

    const config = parseConfig(configPath);
    const workingDir = dirname(configPath);

    try {
        for (const ejfConfig of config) {
            console.log(`Building ${ejfConfig.output}...`);
            await buildEjf(ejfConfig, workingDir);
            console.log();
        }
    } catch (e) {
        if (e instanceof GenerationError) {
            console.error(e.message, e.context || "");
            return;
        }

        throw e;
    }
}

main();