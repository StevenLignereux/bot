require('dotenv').config();
const path = require('path');

const config = {
  bot: {
    token: process.env.DISCORD_TOKEN,
    clientId: process.env.CLIENT_ID,
    guildId: process.env.GUILD_ID,
    intents: [
      'Guilds',
      'GuildMembers',
      'GuildMessages',
      'MessageContent',
      'GuildPresences'
    ]
  },

  paths: {
    base: path.resolve(__dirname, '..', '..'),
    resources: path.resolve(__dirname, '..', '..', 'resources_bot'),
    fonts: path.resolve(__dirname, '..', '..', 'resources_bot', 'fonts'),
    images: path.resolve(__dirname, '..', '..', 'resources_bot', 'images'),
    data: path.resolve(__dirname, '..', '..', 'data')
  },

  channels: {
    welcome: process.env.WELCOME_CHANNEL_ID,
    news: process.env.NEWS_CHANNEL_ID
  },

  welcome: require('./welcome'),
  news: require('./news')
};

function validateConfig() {
  const errors = [];

  if (!config.bot.token) {
    errors.push('DISCORD_TOKEN est manquant dans le fichier .env');
  }
  if (!config.bot.clientId) {
    errors.push('CLIENT_ID est manquant dans le fichier .env');
  }
  if (!config.channels.welcome) {
    errors.push('WELCOME_CHANNEL_ID est manquant dans le fichier .env');
  }
  if (!config.channels.news) {
    errors.push('NEWS_CHANNEL_ID est manquant dans le fichier .env');
  }
  if (!config.news.sites || config.news.sites.length < 2) {
    errors.push('Au moins 2 sites d\'actualités doivent être configurés');
  }

  return errors;
}

module.exports = { config, validateConfig };
