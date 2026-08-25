const { Client, GatewayIntentBits, Partials } = require('discord.js');

const { config, validateConfig } = require('./config');
const WelcomeHandler = require('./features/welcome');
const NewsHandler = require('./features/news');
const logger = require('./utils/logger');

function createClient(intents) {
  const intentMap = {
    Guilds: GatewayIntentBits.Guilds,
    GuildMembers: GatewayIntentBits.GuildMembers,
    GuildMessages: GatewayIntentBits.GuildMessages,
    MessageContent: GatewayIntentBits.MessageContent,
    GuildPresences: GatewayIntentBits.GuildPresences
  };

  const resolvedIntents = [];
  for (const intentName of intents) {
    if (intentMap[intentName]) {
      resolvedIntents.push(intentMap[intentName]);
    } else {
      logger.warn(`Intent inconnu ignoré : ${intentName}`);
    }
  }

  return new Client({
    intents: resolvedIntents,
    partials: [Partials.GuildMember, Partials.User],
    rest: {
      retries: 3,
      timeout: 15_000
    },
    failIfNotExists: false
  });
}

function registerErrorHandlers(client) {
  client.on('error', (error) => {
    logger.error('Erreur client Discord :', error);
  });

  client.on('warn', (info) => {
    logger.warn(`Avertissement client Discord : ${info}`);
  });

  client.on('debug', (info) => {
    if (process.env.DEBUG_DISCORD === 'true') {
      logger.debug(`Debug Discord : ${info}`);
    }
  });

  client.on('shardDisconnect', (event, shardId) => {
    logger.warn(`Shard ${shardId} déconnecté : code ${event.code} - ${event.reason || 'aucune raison'}`);
  });

  client.on('shardReconnecting', (shardId) => {
    logger.info(`Shard ${shardId} en cours de reconnexion...`);
  });

  client.on('shardResume', (shardId, replayed) => {
    logger.info(`Shard ${shardId} reconnecté (${replayed} événements rejoués)`);
  });

  client.on('shardError', (error, shardId) => {
    logger.error(`Erreur shard ${shardId} :`, error);
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Rejet de promesse non géré :', reason instanceof Error ? reason : new Error(String(reason)));
    logger.error(`Détails de la promesse : ${promise}`);
  });

  process.on('uncaughtException', (error) => {
    logger.error('Exception non capturée :', error);
    setTimeout(() => process.exit(1), 1000);
  });
}

async function main() {
  logger.info('=== Démarrage du Bot Discord Guilde ===');

  const configErrors = validateConfig();
  if (configErrors.length > 0) {
    logger.error('Erreurs de configuration détectées :');
    configErrors.forEach(err => logger.error(`  - ${err}`));
    logger.error('Veuillez corriger le fichier .env puis redémarrer le bot.');
    process.exit(1);
  }
  logger.info('Configuration validée avec succès');

  const client = createClient(config.bot.intents);
  registerErrorHandlers(client);

  const welcomeHandler = new WelcomeHandler(client, config);
  const newsHandler = new NewsHandler(client, config);

  client.once('ready', async () => {
    logger.info('====================================');
    logger.info(`Bot connecté en tant que : ${client.user.tag}`);
    logger.info(`ID du bot : ${client.user.id}`);
    logger.info(`Serveurs : ${client.guilds.cache.size}`);
    logger.info(`Membres totaux : ${client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0)}`);
    logger.info('====================================');

    try {
      client.user.setActivity('la guilde', { type: 2 });
      logger.info('Statut du bot mis à jour');
    } catch (statusError) {
      logger.warn('Impossible de définir le statut du bot :', statusError);
    }
  });

  welcomeHandler.register();
  newsHandler.register();

  let shuttingDown = false;
  const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`Signal ${signal} reçu, arrêt propre du bot...`);

    try {
      newsHandler.stopScheduler();
    } catch (e) {
      logger.error('Erreur lors de l\'arrêt du module actualités :', e);
    }

    try {
      await client.destroy();
      logger.info('Client Discord déconnecté proprement');
    } catch (e) {
      logger.error('Erreur lors de la déconnexion du client Discord :', e);
    }

    logger.info('Bot arrêté avec succès');
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  try {
    logger.info('Connexion à Discord en cours...');
    await client.login(config.bot.token);
    logger.info('Connexion à Discord réussie');
  } catch (loginError) {
    logger.error('Échec de la connexion à Discord :', loginError);
    if (loginError.code === 'TOKEN_INVALID' || loginError.message?.includes('invalid token')) {
      logger.error('Le token Discord est invalide. Vérifiez la variable DISCORD_TOKEN dans votre fichier .env.');
    } else if (loginError.code === 50001 || loginError.message?.includes('Missing Access')) {
      logger.error('Le bot n\'a pas les permissions nécessaires. Vérifiez les intents activés sur le portail développeur Discord.');
    }
    process.exit(1);
  }
}

main().catch((fatalError) => {
  logger.error('Erreur fatale pendant le démarrage :', fatalError);
  process.exit(1);
});
