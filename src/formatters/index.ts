import {IFormatter} from "./formatter.js";
import {AtcfFormatter} from "./atcf.js";

export const formatters: {[key: string]: IFormatter} = {
  'atcf': new AtcfFormatter()
};