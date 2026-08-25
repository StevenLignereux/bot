const path = require('path');

module.exports = {
  banner: {
    width: 800,
    height: 300,
    backgroundColor: '#1a1a2e',
    backgroundImage: path.resolve(
      __dirname,
      '..',
      '..',
      'resources_bot',
      'images',
      'welcome.png'
    ),
    overlayOpacity: 0.6,
    overlayColor: '#000000'
  },

  avatar: {
    size: 128,
    x: 336,
    y: 40,
    borderWidth: 6,
    borderColor: '#e94560',
    backgroundColor: '#16213e'
  },

  text: {
    title: {
      content: 'Bienvenue sur le serveur !',
      font: 'bold 36px "Default Font"',
      color: '#ffffff',
      x: 400,
      y: 200,
      align: 'center'
    },
    username: {
      font: 'bold 28px "Default Font"',
      color: '#e94560',
      x: 400,
      y: 240,
      align: 'center',
      maxLength: 32
    },
    subtitle: {
      content: 'Nous sommes heureux de te compter parmi nous',
      font: '20px "Default Font"',
      color: '#a8a8b3',
      x: 400,
      y: 275,
      align: 'center'
    }
  },

  message: {
    content: (member) => `🎉 Bienvenue ${member.user.toString()} sur le serveur !`,
    embed: {
      color: 0xe94560,
      title: (member) => `Nouveau membre : ${member.user.tag}`,
      description: (member) =>
        `Souhaite la bienvenue à ${member.user.toString()} !\n` +
        `Nous sommes maintenant **${member.guild.memberCount}** membres sur le serveur.`,
      fields: [
        {
          name: '📅 Compte créé le',
          value: (member) =>
            `<t:${Math.floor(member.user.createdTimestamp / 1000)}:F>`,
          inline: true
        },
        {
          name: '🆔 ID',
          value: (member) => `\`${member.user.id}\``,
          inline: true
        }
      ],
      footer: {
        text: 'Guilde Bot - Système de bienvenue'
      },
      timestamp: true
    }
  },

  font: {
    path: path.resolve(
      __dirname,
      '..',
      '..',
      'resources_bot',
      'fonts',
      'default.ttf'
    ),
    family: 'Default Font'
  }
};
