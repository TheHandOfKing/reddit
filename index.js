// bot.js
const TelegramBot = require('node-telegram-bot-api');

// Replace this with your actual token
const token = '8119024819:AAGruoDbkG0fV5jBw7c3z9bV2TdS2b44G6c';

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, { polling: true });
const reddit = require('./controller/lib/reddit');

bot.setMyCommands([
    { command: '/scrape', description: 'Start the scraping the account' },
    { command: '/analyse', description: 'Analyze the account' },
    { command: '/help', description: 'Get help using the bot' }
]).then(() => {
    console.log('Commands have been set up');
}).catch(console.error);

bot.onText(/\/scrape (\S+)(?:\s+(week|month|year|all))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const redditUsername = match[1]?.trim(); // Get the Reddit username from the command
    const scope = match[2]; // Default to 'week' if scope is not provided

    // Validate the scope to ensure it's one of the allowed options
    const validScopes = ['week', 'month', 'year', 'all'];
    
    if (!validScopes.includes(scope)) {
        return bot.sendMessage(chatId, 'Invalid date scope. Please use "week", "month", or "year".');
    }

    // Check if the username is provided
    if (!redditUsername) {
        return bot.sendMessage(chatId, 'You must set a Reddit account name to scrape. Please use the format: /scrape <username> [scope]');
    }

    try {
        // Fetch user submissions based on the scope
        const submissions = await reddit.getUser(redditUsername).getSubmissions({ time: scope });

        // Extract subreddits from the submissions
        const subreddits = submissions
            .map(submission => submission.subreddit.display_name)
            .filter((value, index, self) => self.indexOf(value) === index);  // Remove duplicates

        if (subreddits.length > 0) {
            // Send the list of subreddits to Telegram
            bot.sendMessage(chatId, `The Reddit account "${redditUsername}" has posted in the following subreddits in the last ${scope}:\n\n${subreddits.join('\n')}`);
        } else {
            bot.sendMessage(chatId, `The Reddit account "${redditUsername}" has not posted in any subreddits in the last ${scope}.`);
        }

    } catch (error) {
        // If an error occurs, assume the user does not exist
        if (error.statusCode === 404) {
            bot.sendMessage(chatId, `The Reddit account "${redditUsername}" does not exist.`);
        } else {
            console.error('Error:', error);
            bot.sendMessage(chatId, `An error occurred while searching for the account "${redditUsername}".`);
        }
    }
});

bot.onText(/\/analyse (.+)/, (msg, match) => {
    bot.sendMessage(msg.chat.id,"You analyzed" );
});

// Listen for any kind of message and respond with the same message
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    // Check if the message doesn't match /scrape or /analyse
    if (!text.startsWith('/scrape') && !text.startsWith('/analyse')) {
        bot.sendMessage(chatId, "Invalid option, type /scrape or /analyse to do something.");
    }
});

console.log('Bot is up and running...');