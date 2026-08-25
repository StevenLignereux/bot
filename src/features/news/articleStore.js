const fs = require('fs');
const path = require('path');

const logger = require('../../utils/logger');

class ArticleStore {
  constructor(storagePath, maxStored = 500, ttlDays = 30) {
    this.storagePath = path.resolve(storagePath);
    this.maxStored = maxStored;
    this.ttlMs = ttlDays * 24 * 60 * 60 * 1000;
    this.articles = new Map();
    this._loaded = false;
  }

  _ensureDir() {
    const dir = path.dirname(this.storagePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      logger.info(`Dossier de données créé : ${dir}`);
    }
  }

  load() {
    try {
      this._ensureDir();
      if (fs.existsSync(this.storagePath)) {
        const raw = fs.readFileSync(this.storagePath, 'utf-8');
        const data = JSON.parse(raw);
        const now = Date.now();
        let loaded = 0;
        let expired = 0;
        for (const [key, entry] of Object.entries(data)) {
          if (entry.timestamp && now - entry.timestamp > this.ttlMs) {
            expired++;
            continue;
          }
          this.articles.set(key, entry);
          loaded++;
        }
        logger.info(`Stock d'articles chargé : ${loaded} entrées (${expired} expirées supprimées)`);
      } else {
        logger.info('Aucun fichier de stock d\'articles trouvé, démarrage avec un stock vide');
      }
      this._loaded = true;
    } catch (error) {
      logger.error(`Erreur lors du chargement du stock d'articles :`, error);
      this.articles = new Map();
      this._loaded = true;
    }
  }

  save() {
    try {
      this._ensureDir();
      const entries = Array.from(this.articles.entries())
        .sort((a, b) => (b[1].timestamp || 0) - (a[1].timestamp || 0))
        .slice(0, this.maxStored);
      const data = Object.fromEntries(entries);
      fs.writeFileSync(this.storagePath, JSON.stringify(data, null, 2), 'utf-8');
      logger.debug(`Stock d'articles sauvegardé : ${entries.length} entrées`);
    } catch (error) {
      logger.error(`Erreur lors de la sauvegarde du stock d'articles :`, error);
    }
  }

  _buildKey(article) {
    if (article.id) return `id:${article.id}`;
    if (article.url) return `url:${article.url}`;
    if (article.title) return `title:${article.title.trim().toLowerCase().replace(/\s+/g, '-')}`;
    return null;
  }

  has(article) {
    if (!this._loaded) this.load();
    const key = this._buildKey(article);
    if (!key) return false;
    if (this.articles.has(key)) {
      const entry = this.articles.get(key);
      if (entry.timestamp && Date.now() - entry.timestamp > this.ttlMs) {
        this.articles.delete(key);
        return false;
      }
      return true;
    }
    return false;
  }

  mark(article, metadata = {}) {
    if (!this._loaded) this.load();
    const key = this._buildKey(article);
    if (!key) return false;
    this.articles.set(key, {
      url: article.url,
      title: article.title,
      timestamp: Date.now(),
      source: article.source,
      ...metadata
    });
    if (this.articles.size > this.maxStored * 1.5) {
      const sorted = Array.from(this.articles.entries())
        .sort((a, b) => (b[1].timestamp || 0) - (a[1].timestamp || 0));
      this.articles = new Map(sorted.slice(0, this.maxStored));
    }
    return true;
  }
}

module.exports = ArticleStore;
