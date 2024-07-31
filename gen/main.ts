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

    const promises = [];
    try {
        for (const ejfConfig of config) {
            const progressData: ProgressData = {
                current: 0,
                total: 0
            }
            progressMap[ejfConfig.name] = progressData;
            promises.push(buildEjf(ejfConfig, workingDir, progressData));
        }
    } catch (e) {
        if (e instanceof GenerationError) {
            console.error(e.message, e.context || "");
            return;
        }

        throw e;
    }

    const updateInterval = setInterval(async () => {
        const renderData = Object.entries(progressMap).map(([name, data]) => {
            return {
                text: name,
                completed: data.current,
                total: data.total
            };
        }).filter((e) => e.total);
        if (renderData.length) {
            await progress.render(renderData);
        }
    }, 250);

    await Promise.all(promises);

    clearInterval(updateInterval);
}

console.time();
await main();
console.log();
console.timeEnd();