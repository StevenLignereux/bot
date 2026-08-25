module.exports = {
  refreshInterval: process.env.NEWS_REFRESH_INTERVAL || '*/15 * * * *',

  request: {
    timeout: 15000,
    retries: 3,
    retryDelay: 3000,
    maxRedirects: 5,
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'fr-FR,fr;q=0.8,en-US;q=0.5,en;q=0.3'
    }
  },

  deduplication: {
    storagePath: 'data/published_articles.json',
    maxStored: 500,
    ttlDays: 30
  },

  message: {
    embed: {
      color: 0x3498db,
      footer: {
        text: 'Guilde Bot - Actualités'
      },
      timestamp: true,
      maxDescriptionLength: 400
    }
  },

  sites: [
    {
      name: 'Site 1',
      url: process.env.NEWS_SITE_1_URL,
      enabled: true,
      selectors: {
        article: 'article, .post, .news-item, .article-item',
        title: 'h1, h2, h3, .title, .post-title, .news-title',
        link: 'a[href]',
        description: 'p, .excerpt, .summary, .description, .post-excerpt',
        image: 'img[src], .post-image img, .thumbnail img'
      },
      maxArticlesPerFetch: 10
    },
    {
      name: 'Site 2',
      url: process.env.NEWS_SITE_2_URL,
      enabled: true,
      selectors: {
        article: 'article, .post, .news-item, .article-item',
        title: 'h1, h2, h3, .title, .post-title, .news-title',
        link: 'a[href]',
        description: 'p, .excerpt, .summary, .description, .post-excerpt',
        image: 'img[src], .post-image img, .thumbnail img'
      },
      maxArticlesPerFetch: 10
    }
  ]
};
