import {config} from './config.js';

const errorTrace = (error: unknown)=> {
    if (!(error instanceof Error))
        return `${error}`;

    let err = error.message;
    if (error.stack) {
        err += `\n-- Stack ${''.padStart(41, '-')}\n${error.stack}`;
    }
    if (error.cause) {
        err += `\n-- Cause ${''.padStart(41, '-')}\n${(error.cause as any).stack || error.cause}`;
    }
    if (err.length > 0) {
        err += `\n${''.padStart(50, '=')}`;
    }
    return err;
}

export class DiscordNotifier {

    public static async Send(hooks: string[], content: string, error: unknown = null) {
        // Get the list of hooks
        if (hooks.length <= 0)
            return;

        // Transform <@user> with the user ID
        // See https://discord.com/developers/docs/reference#message-formatting
        let transformMessage : string = content;
        if (config.users != null) {

            // For each user, check for mentions with that username.
            const users = config.users;
            for (let username in users) {
                if (users.hasOwnProperty(username))
                    transformMessage = transformMessage.replace(`<@${username}>`, `<@${users[username]}>`);
            }
        }

        // Add error message in code block
        if (error) {
            transformMessage += '\n```\n' + errorTrace(error) + '\n```';
        }

        // Helper method for mock sending
        const sendMessage = async (hook: string, message: string )=> {
            // Build the log message
            const logMessage = `Discord Message (${hook}):\n${message}\n${''.padStart(53, '-')}`;

            // If mock setting is on, don't actually send the message
            if (config.mock) {
                console.log(`!!! MOCK MESSAGE - NOT SENT!!!\n${logMessage}`);
                return;
            }

            console.log(logMessage);

            await fetch(hook, {
                method: 'POST',
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({content: message})
            });
        }

        // Send the message to each hook
        for (let hook of hooks) {
            await sendMessage(hook, transformMessage);
        }
    }
}