import {connect, IFileWatcherMessage, FileWatcherSocket} from "@r-hurricane/noaa-file-watcher-client";
import {config} from './config.js';
import {DiscordNotifier} from "./discord.js";
import {formatters} from './formatters/index.js';

// Define the connection loop
let doShutdown = false;
let socket: FileWatcherSocket | null = null;
const init = () => {

    // Try and establish a connection to the IPC socket
    socket = connect(config.ipcPath, 'Discord Notifier', () => {
        console.log('Connected and awaiting messages\n' + ''.padStart(31, '.'));
        config.watchers.forEach(w => DiscordNotifier.Send(w.webhooks, '-# NOAA File Watcher Connected'));

    }).on('error', (error: Error) => {
        console.error('Error connecting to IPC path: ' + config.ipcPath);
        console.error(error);
        console.error(''.padStart(30, '='));

    }).on('close', () => {
        if (doShutdown) {
            console.log('Socket closed gracefully. Shutting down.');
            return;
        }

        config.watchers.forEach(w => DiscordNotifier.Send(w.webhooks, '-# NOAA File Watcher connection lost'));
        console.log('Connection was closed. Attempting to reestablish connection in 30 seconds.');
        console.log(''.padStart(30, '='));
        setTimeout(init, 30000);

    }).on('messageError', (error: unknown) => {
        console.error('Message receive failed:');
        console.error(error);
        console.error(''.padStart(30, '='));

    }).on('message', (message: IFileWatcherMessage) => {

        switch(message?.cmd) {
            case "shutdown":
                console.log('Shutdown received.');
                config.watchers.forEach(w => DiscordNotifier.Send(w.webhooks, '-# NOAA File Watcher Shutdown'));
                return;

            case "new":
                if (!message.data) return;

                for (let w of config.watchers) {
                    // If parser is defined, check the parsers match
                    if (w.parser && message.data?.parser !== w.parser)
                        continue;

                    // If the incoming file matches a regex, process it
                    for  (let f of w.files) {
                        if (!message.data?.file?.url?.match(f)) continue;

                       let msg = formatters[w.formatter]?.format(message.data);
                       if (msg)
                            DiscordNotifier.Send(w.webhooks, msg);

                        break;
                    }
                }
                return;
        }

        console.error(`Received unknown command: ${message?.cmd}`);
    });
};

init();

const shutdown = (sig: string) => {
    console.log('System Interrupt received: ' + sig);
    config.watchers.forEach(w => DiscordNotifier.Send(w.webhooks, '-# Notifier Shutdown'));
    doShutdown = true;
    socket?.destroy();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));