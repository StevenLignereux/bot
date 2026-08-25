const path = require('path');

module.exports = {
  banner: {
    useNativeImageSize: true,
    defaultWidth: 2000,
    defaultHeight: 600,
    backgroundColor: '#1a1a2e',
    backgroundImage: path.resolve(
      __dirname,
      '..',
      '..',
      'resources_bot',
      'images',
      'welcome.png'
    ),
    overlayOpacity: 0,
    overlayColor: '#000000'
  },

  textBackdrop: {
    enabled: false,
    x: 620,
    y: 40,
    width: 1320,
    height: 520,
    cornerRadius: 32,
    fillColor: 'rgba(0, 0, 0, 0.38)',
    strokeEnabled: true,
    strokeColor: 'rgba(255, 255, 255, 0.12)',
    strokeWidth: 2,
    shadowEnabled: true,
    shadowColor: 'rgba(0, 0, 0, 0.6)',
    shadowBlur: 24,
    shadowOffsetX: 0,
    shadowOffsetY: 6
  },

  avatar: {
    size: 360,
    x: 110,
    y: 120,
    borderWidth: 0,
    borderColor: '#00000000',
    backgroundColor: '#16213e'
  },

  text: {
    defaults: {
      shadowColor: 'rgba(0, 0, 0, 0.85)',
      shadowBlur: 18,
      shadowOffsetX: 0,
      shadowOffsetY: 4,
      strokeColor: '#000000',
      strokeWidth: 4,
      lineJoin: 'round'
    },
    title: {
      content: 'Bienvenue',
      font: 'bold 140px "Default Font"',
      color: '#ffffff',
      x: 1280,
      y: 150,
      align: 'center'
    },
    username: {
      font: 'bold 90px "Default Font"',
      color: '#ffffff',
      x: 1280,
      y: 305,
      align: 'center',
      maxLength: 24
    },
    subtitle: {
      content: 'sur le serveur discord La Flotte exilée !',
      font: 'bold 76px "Default Font"',
      color: '#ffffff',
      x: 1280,
      y: 440,
      align: 'center'
    }
  },

  message: {
    content: (member) => `🎉 Bienvenue ${member.user.toString()} sur le serveur discord **La Flotte exilée** !`
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
