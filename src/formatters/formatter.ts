import {INewFileData} from "@r-hurricane/noaa-file-watcher-client";

export interface IFormatter {
    format: (data: INewFileData) => string | null
}