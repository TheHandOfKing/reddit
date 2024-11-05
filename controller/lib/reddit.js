const snoowrap = require('snoowrap');

const reddit = new snoowrap({
    userAgent: 'EraBot',
    clientId: 'De6063ydR4oVUYDR4uCL9Q',
    clientSecret: 'bLLLG5qrSCNroCHY2HCBYtAkyiUiSA',
    username: 'Danksta12',
    password: 'fuLgrado12'
});

// Test authentication
reddit.getMe().then(user => {
    console.log('Authenticated as:', user);
}).catch(error => {
    console.error('Authentication error:', error);
});

module.exports = reddit;