import {IFormatter} from "./formatter.js";
import {INewFileData} from "@r-hurricane/noaa-file-watcher-client";
import {ITwoFile} from "@r-hurricane/two-parser";

export class TwoFormatter implements IFormatter {

    public format(data: INewFileData): string | null {
        // Get forecast data
        const two = data.json as ITwoFile | null | undefined;
        if (!two) return null;

        // Print quick summary of areas in each basin
        let ret = '';
        let date: string | undefined = undefined;
        let counts: string[] = [];
        let stormTotal = 0;
        for (let b of Object.keys(two.basins)) {
            ret += '__**' + b[0]?.toUpperCase() + b.substring(1) + '**__\n';
            const basin = two.basins[b];
            date ??= basin?.issuedOn?.iso;
            if (!basin || !basin.areas || basin.areas.length <= 0) {
                ret += "None\n\n";
                continue;
            }

            counts.push(`${b.toLowerCase() === 'atlantic' ? 'AL' : 'PA'} (${basin.areas.length})`);
            stormTotal += basin.areas.length;

            for (let [i, f] of basin.areas.entries()) {
                const bold = (f.sevenDay?.chance ?? 0) > 70 ? '**' : '';
                ret += `${i+1}: ${bold}${f.twoDay?.chance.toString().padStart(2, '0') ?? '??'}% / ${f.sevenDay?.chance.toString().padStart(2, '0') ?? '??'}%${bold} - ${f.id ? `(${f.id}) ` : ''}${f.title}\n`;
            }
            ret += '\n';
        }

        let head = `### TWO Update: ${stormTotal == 0 ? 'No Activity' : counts.join(' - ')}\n\n`;
        return head + ret + this.getDate(date ?? data.file.lastModified);
    }

    public getDate(s: string | null): string {
        if (!s) return '';
        const d = new Date(s);
        const p = (v: number): string => v.toString().padStart(2, '0');
        return `-# Issued for ${d.getUTCFullYear()}-${p(d.getUTCMonth()+1)}-${p(d.getUTCDate())} @ ${p(d.getUTCHours())} UTC`;
    }

}