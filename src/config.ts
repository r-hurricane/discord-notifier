import nodeConfig from 'config';

export interface ConfigWatcher {
    webhooks: Array<string>;
    formatter: string,
    parser: string;
    files: Array<string>;
}

export interface ConfigApp {
    ipcPath: string;
    mock: boolean;
    users: {[key: string]: string} | null;
    watchers: Array<ConfigWatcher>;
}

export const config: ConfigApp = {
    ipcPath: nodeConfig.get<string>('ipcPath'),
    mock: nodeConfig.get<boolean>('mock'),
    users: nodeConfig.has('users') ? nodeConfig.get<{[key: string]: string}>('users') : null,
    watchers: nodeConfig.get<Array<ConfigWatcher>>('watchers')
};