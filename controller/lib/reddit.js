const snoowrap = require('snoowrap');

const reddit = new snoowrap({
    userAgent: 'EraBot',
    clientId: '40Uvb312eV3yvdEYBLAvlQ',
    clientSecret: 'tFctPNvK8-jRAucqH_ku_AW84DeMmQ',
    refreshToken: '21530544613-bkx0Y23B8xhPbIH7N0j7uASRoP-ing'
});

module.exports = reddit;