import {IFormatter} from "./formatter.js";
import {INewFileData} from "@r-hurricane/noaa-file-watcher-client";
import {IAtcfFile} from "@r-hurricane/atcf-parser";

export class AtcfFormatter implements IFormatter {

    public format(data: INewFileData): string | null {
        // Get forecast data
        const atcf = data.json as IAtcfFile | null | undefined;
        const c = atcf?.data[0];
        if (!c) return null;

        // Get heading text
        const heading = this.getHeading(atcf);

        // Helper print method if value is defined
        const p =
            (pre: string | null, val: number | string | null | undefined, post: string | null = null): string => {
            return val && (typeof val === "string" || val >= 0) ? `${pre || ''}${val}${post || ''}` : '';
        }

        /*
Assume 0 - NA yet
1) Disturbance (non invest) - Basin, Storm No, Date, Position, Max Wind
2) Disturbance (invest) / Depression / Extra - Above+, Surface Pressure, Outer Pressure, Outer Radius, Max Wind Radius, Gusts, Depth, Storm Name (Invest or Number)
3) Storm / Hurricane - Above+, Wind Radius Intensity, WindCode, Wind Radii, Eye Size, Seas Intensity, SeasCode, Seas Radii

# Heading Message
Tropical Storm Beryl
Pos: 99N 301W
Wind: 20kt / 30kt @ 60NM
Psur: 1007mb - 1011mb @ 75NM
Depth: Medium
Wind Radi: 34kt
40NM ------ 60NM
      20NM
30NM ------ 30NM
Date Time: 06-26 @ 00 UTC
         */

        // Bug: Prints "ATCF Update for AL INVEST | Disturbance INVEST" rather than "ATCF Update for INVEST AL95 | Invest AL95"

        const windCat = this.windCategory(c.maxSusWind);
        return `${heading}
${c.level} ${c.name}${p(' - ', windCat != 'TD' ? windCat : null)}
Pos: ${c.lat?.toFixed(1)} ${c.lon?.toFixed(1)}
Wind: ${c.maxSusWind}kt${p(' / ', c.windGust, 'kt')}${p(' @ ', c.maxWindRad, 'nmi')}
${p('Psur: ', c.minSeaLevelPsur, 'mb' + p(' - ', c.outerPsur, 'mb') + p(' @ ', c.outerRad, 'nmi'))}
${p('Depth: ', c.depth)}
${p('Wind Radi: ', c.windRad?.rad, 'kt' + p(' @ ', c.windRad?.code === 'AAA' ? c.windRad.ne : null, 'nmi'))}
${c.windRad?.code !== 'NEQ' ? '' : 
`${c.windRad.nw?.toString().padStart(3, ' ')}kt ------ ${c.windRad.ne?.toString().padStart(3, ' ')}kt
       ${c.eyeDia?.toString().padStart(2, ' ')}nmi
${c.windRad.sw?.toString().padStart(3, ' ')}kt ------ ${c.windRad.se?.toString().padStart(3, ' ')}kt
`}
Date Time: ${this.getDate(c.date)}
`.replaceAll(/\n\n+/g, '\n');
    }

    public getHeading(atcf: IAtcfFile): string {
        let current = atcf.data[0];
        let last = atcf.data[1];
        if (!current) return '';

        // If new system (i.e. only one line) notify new system!
        if (atcf.data.length == 1)
            return `# New ATCF Genesis ${current.basin}-GEN${current.genNo}!`;

        // If latest has Invest set, print the invest
        if (current.invest)
            return `# Spawn Invest ${current.basin}-GEN${current.genNo} => ${current.basin}${current.invest.to.id}!`;

        // If latest has transition set, print the new storm name
        if (current.trans || (last && last.name != current.name))
            return `# ${current.level} ${current.name} has formed in the ${current.basin}!`;

        // If dissipated, print last notification
        if (current.diss)
            return `# ${current.name} has dissipated.`;

        // If wind strength changes category
        if (last) {
            const lastCat = this.windCategory(last.maxSusWind);
            const currentCat = this.windCategory(current.maxSusWind);
            if (lastCat != currentCat)
                return `# ${current.name} now a ${currentCat}`;
        }

        // Default heading
        return `*ATCF Update for ${current.basin} ${current.name}*`;
    }

    public windCategory(susWind: number | null): string | null {
        if (susWind == null) return null;
        if (susWind >= 137) return 'CAT5';
        if (susWind >= 113) return 'CAT4';
        if (susWind >= 96) return 'CAT3';
        if (susWind >= 83) return 'CAT2';
        if (susWind >= 64) return 'CAT1';
        if (susWind >= 34) return 'TS';
        return 'TD';
    }

    public getDate(s: string | null): string {
        if (!s) return '';
        const d = new Date(s);
        const p = (v: number): string => v.toString().padStart(2, '0');
        return `${p(d.getUTCMonth()+1)}-${p(d.getUTCDate())} @ ${p(d.getUTCHours())} UTC`;
    }
}