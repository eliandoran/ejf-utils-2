import parseConfig from "./config.ts";
import buildEjf, { ProgressData } from "./ejf.ts";
import GenerationError from "./errors.ts";
import { dirname } from "jsr:@std/path@^1.0.0";
import { MultiProgressBar } from "https://deno.land/x/progress@v1.4.9/mod.ts";

const configPath = Deno.args[0];

async function main() {
    if (!configPath) {
        console.error("Missing config path.");
        return;
    }

    const config = parseConfig(configPath);
    const workingDir = dirname(configPath);
    const progressMap: Record<string, ProgressData> = {};
    const progress = new MultiProgressBar({
        display: ":bar :eta :completed/:total :text",
    });
    const updateInterval = setInterval(async () => {
        const renderData = Object.entries(progressMap).map(([name, data]) => {
            return {
                text: `${name}, height: ${data.height}px, ignored: ${data.numIgnoredChars}`,
                completed: data.current,
                total: data.total
            };
        }).filter((e) => e.total);
        if (renderData.length) {
            await progress.render(renderData);
        }
    }, 250);

    const promises = [];
    try {
        for (const ejfConfig of config.fonts) {
            const progressData: ProgressData = {
                current: 0,
                total: 0,
                height: 0,
                numIgnoredChars: 0
            }
            const name = Array.isArray(ejfConfig) ? ejfConfig[0].name : ejfConfig.name;
            progressMap[name] = progressData;
            promises.push(buildEjf(ejfConfig, workingDir, progressData));
        }

        await Promise.all(promises);
    } catch (e) {
        if (e instanceof GenerationError) {
            console.error("ERROR:", e.message, e.context || "");
            return;
        }

        throw e;
    }

    clearInterval(updateInterval);
}

console.time();
await main();
console.log();
console.timeEnd();