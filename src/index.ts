import {connect, IFileWatcherMessage, FileWatcherSocket} from "@r-hurricane/noaa-file-watcher-client";
import {config} from './config.js';
import {DiscordNotifier} from "./discord.js";
import {formatters} from './formatters/index.js';

// Helper method to notify all
const allHooks = [...new Set(config.watchers.flatMap(w => w.webhooks))];

// Define the connection loop
let doShutdown = false;
let reconnectTimeout: NodeJS.Timeout | null = null;
let socket: FileWatcherSocket | null = null;
const init = () => {

    reconnectTimeout = null;

    // Try and establish a connection to the IPC socket
    socket = connect(config.ipcPath, 'Discord Notifier', () => {
        console.log('Connected and awaiting messages\n' + ''.padStart(31, '.'));
        DiscordNotifier.Send(allHooks, '-# NOAA File Watcher Connected');

    }).on('error', (error: Error) => {
        console.error('Error connecting to IPC path: ' + config.ipcPath);
        console.error(error);
        console.error(''.padStart(30, '='));

    }).on('close', () => {
        if (doShutdown) {
            console.log('Socket closed gracefully. Shutting down.');
            return;
        }

        DiscordNotifier.Send(allHooks, '-# NOAA File Watcher connection lost');
        console.log('Connection was closed. Attempting to reestablish connection in 30 seconds.');
        console.log(''.padStart(30, '='));
        reconnectTimeout = setTimeout(init, 30000);

    }).on('messageError', (error: unknown) => {
        console.error('Message receive failed:');
        console.error(error);
        console.error(''.padStart(30, '='));

    }).on('message', (message: IFileWatcherMessage) => {

        switch(message?.cmd) {
            case "shutdown":
                console.log('Shutdown received.');
                DiscordNotifier.Send(allHooks, '-# NOAA File Watcher Shutdown');
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
                            DiscordNotifier.Send(w.webhooks, ''.padStart(20, '-') + '\n' + msg);

                        break;
                    }
                }
                return;
        }

        console.error(`Received unknown command: ${message?.cmd}`);
    });
};

init();

const shutdown = async (sig: string) => {
    console.log('System Interrupt received: ' + sig);
    doShutdown = true;
    await DiscordNotifier.Send(allHooks, '-# Notifier Shutdown');
    socket?.destroy();
    if (reconnectTimeout)
        clearTimeout(reconnectTimeout);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));