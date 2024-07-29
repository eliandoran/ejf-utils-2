import { stringify } from "jsr:@libs/xml/";

interface HeaderInfo {
    baseline: number;
    height: number;
    name: string,
    spaceWidth: number,
    characters: number[]
}

export default function buildHeader(info: HeaderInfo) {
    const data = {
        "@version": "1.0",
        "@encoding": "UTF-8",
        "@standalone": "no",
        FontGenerator: {
            Informations: {
                "@Vendor": "IS2T",
                "@Version": "0.8"
            },
            FontProperties: {
                "@Baseline": info.baseline,
                "@Filter": "",
                "@Height": info.height,
                "@Name": info.name,
                "@Space": info.spaceWidth,
                "@Style": "p",
                "@Width": "-1",
                Identifier: { "@Value": "34" }
            },
            FontCharacterProperties: {
                Character: info.characters.map((ch) => {
                    return {
                        "@Index": `0x${ch.toString(16)}`,
                        "@LeftSpace": 0,
                        "@RightSpace": 0
                    };
                })
            }
        }
    };

    return stringify(data);
}