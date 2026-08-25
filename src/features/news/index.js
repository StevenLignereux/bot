const { EmbedBuilder } = require('discord.js');
const cron = require('node-cron');

const { scrapeAllSites } = require('./scraper');
const ArticleStore = require('./articleStore');
const logger = require('../../utils/logger');

class NewsHandler {
  constructor(client, config) {
    this.client = client;
    this.config = config;
    this.newsConfig = config.news;
    this.channelId = config.channels.news;
    this.cronTask = null;

    const dedup = this.newsConfig.deduplication;
    this.store = new ArticleStore(
      dedup.storagePath,
      dedup.maxStored,
      dedup.ttlDays
    );
  }

  async getChannel() {
    try {
      const channel = await this.client.channels.fetch(this.channelId);
      if (!channel || !channel.isTextBased()) {
        logger.error(`Canal d'actualités invalide : ${this.channelId}`);
        return null;
      }
      return channel;
    } catch (error) {
      logger.error(`Impossible de récupérer le canal d'actualités ${this.channelId} :`, error);
      return null;
    }
  }

  buildArticleEmbed(article) {
    const embedConfig = this.newsConfig.message.embed;
    const embed = new EmbedBuilder()
      .setColor(embedConfig.color)
      .setTitle(article.title || 'Article sans titre');

    if (article.url) {
      embed.setURL(article.url);
    }

    if (article.description) {
      const maxLen = embedConfig.maxDescriptionLength || 400;
      let desc = article.description;
      if (desc.length > maxLen) {
        desc = desc.slice(0, maxLen - 1).trimEnd() + '…';
      }
      embed.setDescription(desc);
    }

    if (article.image) {
      embed.setImage(article.image);
    }

    if (article.source) {
      embed.setAuthor({ name: article.source });
    }

    if (embedConfig.footer) {
      embed.setFooter({ text: embedConfig.footer.text });
    }

    if (embedConfig.timestamp) {
      embed.setTimestamp(article.fetchedAt ? new Date(article.fetchedAt) : new Date());
    }

    return embed;
  }

  async publishArticle(article, channel) {
    try {
      const embed = this.buildArticleEmbed(article);
      const messageContent = article.url ? `📰 ${article.url}` : null;

      const payload = { embeds: [embed] };
      if (messageContent) {
        payload.content = messageContent;
      }

      const sent = await channel.send(payload);
      logger.info(`Actualité publiée : "${article.title}" (${article.source}) - message: ${sent.id}`);

      this.store.mark(article, { messageId: sent.id, channelId: channel.id });
      return sent;
    } catch (error) {
      logger.error(`Erreur lors de la publication de l'article "${article.title}" :`, error);
      throw error;
    }
  }

  async fetchAndPublish() {
    try {
      logger.info('=== Début du cycle de récupération des actualités ===');

      const channel = await this.getChannel();
      if (!channel) {
        logger.warn('Canal d\'actualités non disponible, cycle annulé');
        return 0;
      }

      const articles = await scrapeAllSites(this.newsConfig.sites, this.newsConfig.request);

      if (articles.length === 0) {
        logger.info('Aucun article récupéré pendant ce cycle');
        return 0;
      }

      const newArticles = articles.filter(article => !this.store.has(article));
      logger.info(`${newArticles.length} nouveaux articles à publier sur ${articles.length} récupérés`);

      let published = 0;
      for (const article of newArticles) {
        try {
          await this.publishArticle(article, channel);
          published++;
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (publishError) {
          logger.warn(`Impossible de publier l'article "${article.title}", il sera réessayé au prochain cycle :`, publishError.message);
        }
      }

      this.store.save();
      logger.info(`=== Cycle terminé : ${published} article(s) publié(s) ===`);
      return published;
    } catch (error) {
      logger.error('Erreur fatale pendant le cycle de récupération/publication :', error);
      try {
        this.store.save();
      } catch (saveError) {
        logger.error('Impossible de sauvegarder le store après erreur :', saveError);
      }
      return 0;
    }
  }

  startScheduler() {
    if (this.cronTask) {
      logger.warn('Le planificateur d\'actualités est déjà démarré');
      return;
    }

    this.store.load();

    const interval = this.newsConfig.refreshInterval;
    logger.info(`Démarrage du planificateur d'actualités (intervalle: ${interval})`);

    try {
      this.cronTask = cron.schedule(interval, () => {
        this.fetchAndPublish().catch(err => {
          logger.error('Erreur non gérée dans la tâche cron des actualités :', err);
        });
      }, {
        scheduled: true,
        timezone: 'Europe/Paris'
      });

      logger.info('Planificateur d\'actualités démarré avec succès');
      setTimeout(() => {
        logger.info('Exécution initiale du cycle d\'actualités...');
        this.fetchAndPublish().catch(err => {
          logger.error('Erreur pendant l\'exécution initiale :', err);
        });
      }, 5000);
    } catch (error) {
      logger.error('Impossible de démarrer le planificateur d\'actualités :', error);
      this.cronTask = null;
    }
  }

  stopScheduler() {
    if (this.cronTask) {
      this.cronTask.stop();
      this.cronTask = null;
      this.store.save();
      logger.info('Planificateur d\'actualités arrêté');
    }
  }

  register() {
    this.client.once('ready', () => {
      logger.info('Client Discord prêt, démarrage du module actualités...');
      this.startScheduler();
    });

    this.client.on('error', (error) => {
      logger.error('Erreur client Discord détectée, sauvegarde du store...', error);
      try {
        this.store.save();
      } catch (saveError) {
        logger.error('Impossible de sauvegarder le store :', saveError);
      }
    });

    process.on('beforeExit', () => {
      this.store.save();
      this.stopScheduler();
    });

    process.on('SIGINT', () => {
      logger.info('Signal SIGINT reçu, arrêt propre du module actualités...');
      this.store.save();
      this.stopScheduler();
    });

    logger.info('Handler d\'actualités enregistré');
  }
}

module.exports = NewsHandler;
