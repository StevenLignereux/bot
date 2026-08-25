const { AttachmentBuilder } = require('discord.js');

const { generateWelcomeBanner } = require('./bannerGenerator');
const logger = require('../../utils/logger');

class WelcomeHandler {
  constructor(client, config) {
    this.client = client;
    this.config = config;
    this.channelId = config.channels.welcome;
    this.welcomeConfig = config.welcome;
  }

  async getChannel() {
    try {
      const channel = await this.client.channels.fetch(this.channelId);
      if (!channel || !channel.isTextBased()) {
        logger.error(`Canal de bienvenue invalide : ${this.channelId}`);
        return null;
      }
      return channel;
    } catch (error) {
      logger.error(`Impossible de récupérer le canal de bienvenue ${this.channelId} :`, error);
      return null;
    }
  }

  buildMessageContent(member) {
    const contentFn = this.welcomeConfig.message?.content;
    if (!contentFn) return null;
    return typeof contentFn === 'function' ? contentFn(member) : contentFn;
  }

  async handleGuildMemberAdd(member) {
    try {
      logger.info(`Nouveau membre rejoint le serveur : ${member.user.tag} (${member.user.id})`);

      const channel = await this.getChannel();
      if (!channel) {
        logger.warn('Canal de bienvenue non disponible, message ignoré');
        return;
      }

      const bannerBuffer = await generateWelcomeBanner(member, this.welcomeConfig);
      const attachment = new AttachmentBuilder(bannerBuffer, { name: 'welcome-banner.png' });

      const messageContent = this.buildMessageContent(member);

      const payload = {
        files: [attachment]
      };

      if (messageContent) {
        payload.content = messageContent;
      }

      const sentMessage = await channel.send(payload);
      logger.info(`Bannière de bienvenue envoyée pour ${member.user.tag} (message: ${sentMessage.id})`);

      return sentMessage;
    } catch (error) {
      logger.error(`Erreur lors de l'envoi de la bannière pour ${member.user?.tag || member.id} :`, error);

      try {
        const channel = await this.getChannel();
        if (channel) {
          await channel.send({
            content: `🎉 Bienvenue ${member.user ? member.user.toString() : 'nouveau membre'} ! Nous sommes heureux de te compter parmi nous !`
          }).catch(e => logger.error('Échec de l\'envoi du message de secours :', e));
        }
      } catch (fallbackError) {
        logger.error('Échec total du système de bienvenue :', fallbackError);
      }
    }
  }

  register() {
    this.client.on('guildMemberAdd', (member) => {
      if (!this.config.bot.guildId || member.guild.id === this.config.bot.guildId) {
        this.handleGuildMemberAdd(member).catch(err => {
          logger.error('Erreur non gérée dans handleGuildMemberAdd :', err);
        });
      }
    });
    logger.info('Handler de bienvenue enregistré');
  }
}

module.exports = WelcomeHandler;
