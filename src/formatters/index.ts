import {IFormatter} from "./formatter.js";
import {AtcfFormatter} from "./atcf.js";
import {TwoFormatter} from "./two.js";

export const formatters: {[key: string]: IFormatter} = {
  'atcf': new AtcfFormatter(),
  'two': new TwoFormatter()
};