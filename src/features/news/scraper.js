const axios = require('axios');
const cheerio = require('cheerio');
const { URL } = require('url');

const logger = require('../../utils/logger');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function cleanText(text) {
  if (!text) return '';
  return text
    .replace(/\s+/g, ' ')
    .replace(/\u00a0/g, ' ')
    .trim();
}

function resolveUrl(baseUrl, relativeUrl) {
  try {
    return new URL(relativeUrl, baseUrl).href;
  } catch {
    return null;
  }
}

async function fetchWithRetry(url, requestConfig) {
  const { timeout = 15000, retries = 3, retryDelay = 3000, headers, maxRedirects = 5 } = requestConfig || {};

  let lastError;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await axios.get(url, {
        timeout,
        headers,
        maxRedirects,
        validateStatus: (status) => status >= 200 && status < 400
      });
      return response;
    } catch (error) {
      lastError = error;
      const status = error.response?.status;
      const isRetryable = !status || status >= 500 || status === 429 || status === 408;

      logger.warn(`Tentative ${attempt}/${retries} échouée pour ${url} : ${error.message}` +
        (status ? ` (status ${status})` : ''));

      if (attempt < retries && isRetryable) {
        const delay = retryDelay * attempt;
        logger.debug(`Nouvelle tentative dans ${delay}ms...`);
        await sleep(delay);
      } else if (!isRetryable) {
        break;
      }
    }
  }
  throw lastError || new Error(`Échec de la requête après ${retries} tentatives`);
}

function extractArticle($, element, baseUrl, selectors, siteName) {
  const el = $(element);

  const titleEl = el.find(selectors.title).first();
  const title = cleanText(titleEl.text() || titleEl.attr('title'));

  let url = null;
  const linkEl = el.find(selectors.link).first();
  const rawHref = linkEl.attr('href') || titleEl.closest('a').attr('href') || el.closest('a').attr('href');
  if (rawHref) {
    url = resolveUrl(baseUrl, rawHref);
  }

  const descriptionEl = el.find(selectors.description).first();
  const description = cleanText(descriptionEl.text()).slice(0, 500);

  let image = null;
  const imageEl = el.find(selectors.image).first();
  const rawSrc = imageEl.attr('src') || imageEl.attr('data-src') || imageEl.attr('srcset')?.split(' ')[0];
  if (rawSrc) {
    image = resolveUrl(baseUrl, rawSrc);
  }

  if (!title && !url) return null;

  return {
    title: title || 'Article sans titre',
    url,
    description,
    image,
    source: siteName,
    fetchedAt: Date.now()
  };
}

async function scrapeSite(siteConfig, requestConfig) {
  const { name: siteName, url: siteUrl, selectors, maxArticlesPerFetch = 10, enabled } = siteConfig;

  if (!enabled) {
    logger.info(`Site ${siteName} désactivé, ignoré`);
    return [];
  }

  if (!siteUrl) {
    logger.warn(`URL manquante pour le site ${siteName}`);
    return [];
  }

  try {
    logger.info(`Récupération des actualités depuis ${siteName} : ${siteUrl}`);
    const response = await fetchWithRetry(siteUrl, requestConfig);
    const html = response.data;
    const $ = cheerio.load(html, { xmlMode: false });

    const articleElements = $(selectors.article).toArray();
    logger.debug(`${articleElements.length} éléments d'articles trouvés sur ${siteName}`);

    const articles = [];
    for (const element of articleElements.slice(0, maxArticlesPerFetch * 2)) {
      try {
        const article = extractArticle($, element, siteUrl, selectors, siteName);
        if (article && (article.url || article.title !== 'Article sans titre')) {
          articles.push(article);
          if (articles.length >= maxArticlesPerFetch) break;
        }
      } catch (extractError) {
        logger.warn(`Erreur d'extraction d'un article sur ${siteName} :`, extractError);
      }
    }

    logger.info(`${articles.length} articles extraits de ${siteName}`);
    return articles;
  } catch (error) {
    logger.error(`Échec de la récupération des actualités pour ${siteName} (${siteUrl}) :`, error);
    return [];
  }
}

async function scrapeAllSites(sites, requestConfig) {
  if (!Array.isArray(sites) || sites.length === 0) {
    logger.warn('Aucun site configuré pour la récupération des actualités');
    return [];
  }

  const results = await Promise.allSettled(
    sites.map(site => scrapeSite(site, requestConfig))
  );

  const allArticles = [];
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      allArticles.push(...result.value);
    } else {
      const siteName = sites[index]?.name || `site ${index + 1}`;
      logger.error(`Erreur fatale pour ${siteName} :`, result.reason);
    }
  });

  logger.info(`Total de ${allArticles.length} articles récupérés depuis ${sites.length} sites`);
  return allArticles;
}

module.exports = {
  scrapeSite,
  scrapeAllSites,
  fetchWithRetry,
  cleanText,
  resolveUrl
};
