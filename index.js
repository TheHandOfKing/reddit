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

bot.onText(/\/scrape (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const redditUsername = match[1].trim(); // Get the Reddit username from the command

    try {
        // Try to fetch the Reddit user
        const user = await reddit.getUser(redditUsername).fetch();
        console.log(user);
        // If we successfully get the user, send a success message
        bot.sendMessage(chatId, `The Reddit account "${redditUsername}" exists!`);
        
        // Further scraping or handling code can go here

    } catch (error) {
        // If an error occurs, assume the user does not exist
        if (error.statusCode === 404) {
            bot.sendMessage(chatId, `The Reddit account "${redditUsername}" does not exist.`);
        } else {
            console.error('Authentication error:', error);
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