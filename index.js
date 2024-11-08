// bot.js
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');  // Required for file handling
const path = require('path'); // Required for file path management

// Replace this with your actual token
const token = '8119024819:AAGruoDbkG0fV5jBw7c3z9bV2TdS2b44G6c';

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, { polling: true });
const { DateTime } = require('luxon')
const reddit = require('./controller/lib/reddit');

// Function to log the command details
const logNames = (redditUsername, scope, command, msg) => {
    const logMessage = `Reddit Username: ${redditUsername}, Scope: ${scope}, Command: ${command}, User: ${msg.from.username}, User First Name: ${msg.from.first_name}, Date: ${new Date().toISOString()}\n`;
    const logFilePath = path.join(__dirname, 'reddit_commands.log');

    // Read the log file first
    fs.readFile(logFilePath, 'utf8', (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') {
                // Log file doesn't exist yet, so we create it
                console.log('Log file does not exist, creating a new one.');
            } else {
                console.error('Error reading the log file:', err);
                return;
            }
        }

        // Check if the Reddit username already exists in the log
        if (data && data.includes(`Reddit Username: ${redditUsername}`)) {
            console.log(`The Reddit username "${redditUsername}" is already logged.`);
            return;
        }

        // If the username is not found, append the new log message
        fs.appendFile(logFilePath, logMessage, (err) => {
            if (err) {
                console.error('Error writing to log file:', err);
            } else {
                console.log(`Logged new Reddit username: ${redditUsername}`);
            }
        });
    });
};

bot.setMyCommands([
    { command: '/scrape', description: 'Start the scraping the account' },
    { command: '/analyse', description: 'Analyze the account' },
    { command: '/help', description: 'Get help using the bot' },
    { command: '/cqs', description: 'Check the cqs of the account' }
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
            logNames(redditUsername, scope, '/scrape', msg);
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

bot.onText(/\/analyse (\S+)(?:\s+(week|month|year|all))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const redditUsername = match[1]?.trim(); // Get the Reddit username from the command
    const scope = match[2] || 'week'; // Default to 'week' if no scope is provided

    // Validate the scope to ensure it's one of the allowed options
    const validScopes = ['week', 'month', 'year', 'all'];
    if (!validScopes.includes(scope)) {
        return bot.sendMessage(chatId, 'Invalid date scope. Please use "week", "month", "year", or "all".');
    }

    // Check if the username is provided
    if (!redditUsername) {
        return bot.sendMessage(chatId, 'You must set a Reddit account name to analyze. Please use the format: /analyse <username> [scope]');
    }

    try {
        // Try to fetch the Reddit user
        const user = await reddit.getUser(redditUsername).fetch();

        // Fetch user submissions and comments based on the scope
        let submissions, comments;
        const now = DateTime.utc();
        let cutoffDate;

        // Calculate the cutoff date based on the scope
        switch (scope) {
            case 'week':
                cutoffDate = now.minus({ weeks: 1 });
                break;
            case 'month':
                cutoffDate = now.minus({ months: 1 });
                break;
            case 'year':
                cutoffDate = now.minus({ years: 1 });
                break;
            case 'all':
                cutoffDate = DateTime.fromMillis(0); // No cutoff date, all time
                break;
            default:
                cutoffDate = now.minus({ weeks: 1 });  // Default to week if invalid scope
                break;
        }

        // Fetch submissions and comments for the user
        submissions = await reddit.getUser(redditUsername).getSubmissions({ time: scope });
        comments = await reddit.getUser(redditUsername).getComments({ time: scope });

        // Filter submissions and comments by the cutoff date
        submissions = submissions.filter(submission => DateTime.fromSeconds(submission.created_utc) >= cutoffDate);
        comments = comments.filter(comment => DateTime.fromSeconds(comment.created_utc) >= cutoffDate);

        // Calculate the total number of comments received on user's submissions
        let totalReceivedComments = 0;
        let totalViews = 0;
        let totalUpvotes = 0;
        let totalFollowers = user.subscribers; // User followers count
        let topPosts = [];

        // Process each submission to get views and received comments
        for (let submission of submissions) {
            console.log(submission);
            
            // Add views for each submission (if available)
            totalViews += submission.view_count || 0; // Fallback to 0 if no view count available

            // Add upvotes for each submission
            totalUpvotes += submission.ups;

            // Fetch comments for this submission
            const submissionComments = submission.num_comments;

            // Count how many comments this user has received (filtering by submission author)
            totalReceivedComments += submissionComments;

        }

        // Sort the submissions by upvotes and get the top 5 posts
        topPosts = submissions.sort((a, b) => b.ups - a.ups).slice(0, 5);

        // Format the top posts text
        const topPostsText = topPosts
            .map((post, index) => `${index + 1}. [${post.title}](https://www.reddit.com${post.permalink}) - ${post.ups} upvotes, ${post.view_count || 0} views`)
            .join('\n');

        // Construct the stats message
        let statsMessage = `**Stats for Reddit User: ${redditUsername} (Last ${scope})**\n\n`;
        statsMessage += `- Total Comments Received: ${totalReceivedComments}\n`;
        statsMessage += `- Total Upvotes: ${totalUpvotes}\n`;
        statsMessage += `- Total Views: ${totalViews}\n`;
        statsMessage += `- Total Followers: ${totalFollowers}\n`;
        statsMessage += `- **Top 5 Posts**:\n${topPostsText || "No posts in this time period."}`;

        // Send stats message to the Telegram user
        bot.sendMessage(chatId, statsMessage, { parse_mode: 'Markdown' });
        logNames(redditUsername, scope, '/analyse', msg);

    } catch (error) {
        // If an error occurs, assume the user does not exist
        if (error.statusCode === 404) {
            bot.sendMessage(chatId, `The Reddit account "${redditUsername}" does not exist.`);
        } else {
            console.error('Error:', error);
            bot.sendMessage(chatId, `An error occurred while analyzing the account "${redditUsername}".`);
        }
    }
});

bot.onText(/\/cqs (\S+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    let redditUsername = match[1]?.trim(); // Get the Reddit username from the command

    // Check if the username is provided
    if (!redditUsername) {
        return bot.sendMessage(chatId, 'You must set a Reddit account name to check CQS. Please use the format: /cqs <username>');
    }

    // Log the command (optional)
    logNames(redditUsername, 'all', '/cqs', msg);  // Log with 'all' as we don't need a time scope for this

    try {
        // Fetch the Reddit user data
        const user = await reddit.getUser(redditUsername).fetch();

        // Retrieve karma stats
        const commentKarma = user.comment_karma || 0;
        const postKarma = user.link_karma || 0;

        // Calculate the total karma
        const totalKarma = commentKarma + postKarma;

        // Estimate CQS based on karma, top posts, and received comments
        let qualityScore = 'Low';
        let topPosts = [];
        let totalReceivedComments = 0;
        let totalUpvotes = 0;

        // Get user's recent posts (no date filter, fetch all time)
        const submissions = await reddit.getUser(redditUsername).getSubmissions();
        submissions.forEach(submission => {
            totalReceivedComments += submission.num_comments || 0;
            totalUpvotes += submission.ups || 0;
        });

        // Sort top posts by upvotes to calculate CQS more meaningfully
        topPosts = submissions.sort((a, b) => b.ups - a.ups).slice(0, 5);

        // Estimation logic for CQS
        if (totalKarma > 10000 && totalReceivedComments > 500) {
            qualityScore = 'High';
        } else if (totalKarma > 5000 || totalReceivedComments > 100) {
            qualityScore = 'Medium';
        }

        // Construct the CQS message
        let cqsMessage = `**Contributor Quality Score (CQS) for Reddit User: ${redditUsername}**\n\n`;
        cqsMessage += `- **Estimated CQS**: ${qualityScore}\n\n`;

        // Send the CQS message to the Telegram user
        bot.sendMessage(chatId, cqsMessage);

    } catch (error) {
        // Handle errors (e.g., user not found)
        if (error.statusCode === 404) {
            bot.sendMessage(chatId, `The Reddit account "${redditUsername}" does not exist.`);
        } else {
            console.error('Error:', error);
            bot.sendMessage(chatId, `An error occurred while fetching CQS for the account "${redditUsername}".`);
        }
    }
});

// Listen for any kind of message and respond with the same message
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    // Check if the message doesn't match /scrape or /analyse
    if (!text.startsWith('/scrape') && !text.startsWith('/analyse') && !text.startsWith('/cqs') && !text.startsWith('/help')) {
        bot.sendMessage(chatId, "Invalid option, refer to help for available options.");
    }
});

console.log('Bot is up and running...');