import parseCharRange from "./char_range.ts";
import buildEjf from "./ejf.ts";
import buildHeader from "./header.ts";

const ttfPath = Deno.args[0];
const outputPath = Deno.args[1];

// await buildEjf({
//     ttfPath,
//     outputPath,
//     charRange: "0x2d,0x30-0x3b,0x41-0x5b,0x61-0x7a",
//     size: 40
// });

console.log(buildHeader({
    baseline: 13,
    height: 20,
    name: "RobotoRegular18",
    spaceWidth: 4,
    characters: parseCharRange("0x2d,0x30-0x3b,0x41-0x5b,0x61-0x7a")
}));