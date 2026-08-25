# Bot Discord Guilde

Bot Discord complet avec deux fonctionnalités principales :
1. **Bannières de bienvenue personnalisées** lors de l'arrivée de nouveaux membres
2. **Agrégation et publication automatique d'actualités** depuis deux sites sources

## Prérequis

- **Node.js** >= 18.0.0 (LTS recommandée : 20.x)
- **npm** (inclus avec Node.js)
- Un token de bot Discord (créé sur le [Portail Développeur Discord](https://discord.com/developers/applications))
- Le bot doit être invité sur le serveur avec les permissions suivantes :
  - `Send Messages` (Envoyer des messages)
  - `Embed Links` (Intégrer des liens)
  - `Attach Files` (Joindre des fichiers)
  - `Read Message History` (Lire l'historique des messages)
  - `Server Members Intent` doit être activé sur le portail développeur (pour les événements d'arrivée de membres)
  - `Message Content Intent` doit être activé sur le portail développeur

## Installation

### 1. Cloner / préparer le projet

```bash
cd bot
```

### 2. Installer les dépendances

```bash
npm install
```

> **Note pour Windows** : `@napi-rs/canvas` fournit des binaires précompilés pour la plupart des plateformes. Si une erreur survient, mettez à jour npm et Node.js.

### 3. Configurer le fichier .env

Copiez le fichier d'exemple et remplissez-le avec vos valeurs :

```bash
cp .env.example .env
```

Éditez `.env` :

```ini
# Token du bot Discord (obligatoire)
DISCORD_TOKEN=votre_token_discord_ici

# ID du client (App ID) du bot (obligatoire)
CLIENT_ID=123456789012345678

# ID du serveur Discord (optionnel, filtre les événements membre à ce serveur)
GUILD_ID=987654321098765432

# ID du canal de bienvenue
WELCOME_CHANNEL_ID=111222333444555666

# ID du canal d'actualités
NEWS_CHANNEL_ID=777888999000111222

# URL des deux sites d'actualités à surveiller
NEWS_SITE_1_URL=https://exemple-site-1.com/actualites
NEWS_SITE_2_URL=https://exemple-site-2.com/news

# Intervalle de rafraîchissement au format cron (ici : toutes les 15 minutes)
NEWS_REFRESH_INTERVAL=*/15 * * * *

# Niveau de log : error, warn, info, debug (par défaut : info)
LOG_LEVEL=info
```

### 4. Ressources personnalisées (bannière de bienvenue)

Le dossier `resources_bot/` contient les assets utilisés pour générer les bannières :

```
resources_bot/
├── fonts/
│   └── default.ttf       # Police de caractères pour la bannière
└── images/
    └── welcome.png       # Image de fond de la bannière (800x300 recommandé)
```

- **Police** : Remplacez `default.ttf` par votre police préférée (format `.ttf` ou `.otf`).
- **Image de fond** : Remplacez `welcome.png` par votre image personnalisée (format PNG ou JPG). Le rapport d'affichage sera rogné pour correspondre à 800x300 pixels.

## Démarrage

### Production

```bash
npm start
```

### Développement (redémarrage automatique)

```bash
npm run dev
```

## Configuration avancée

Tous les paramètres détaillés se trouvent dans le dossier `src/config/` :

### `src/config/welcome.js` — Bannière de bienvenue

- `banner.width` / `banner.height` : dimensions de l'image générée (défaut : 800x300)
- `banner.backgroundColor` : couleur de fond si aucune image n'est chargée
- `banner.backgroundImage` : chemin vers l'image de fond
- `banner.overlayOpacity` / `overlayColor` : assombrissement pour améliorer la lisibilité du texte
- `avatar.size` / `avatar.x` / `avatar.y` : taille et position de l'avatar rond
- `avatar.borderWidth` / `borderColor` : bordure colorée autour de l'avatar
- `text.title` / `text.username` / `text.subtitle` : contenu, police, couleur et position de chaque texte
- `message.content(member)` : texte mentionnant le membre (par défaut avec `user.toString()` pour le ping)
- `message.embed` : structure de l'embed Discord (titre, description, champs, couleur)

### `src/config/news.js` — Actualités

- `refreshInterval` : expression cron pour le cycle de rafraîchissement (défaut : toutes les 15 minutes)
  - Exemples :
    - `*/5 * * * *` → toutes les 5 minutes
    - `0 * * * *` → toutes les heures à la minute 0
    - `0 */6 * * *` → toutes les 6 heures
- `request.timeout` / `retries` / `retryDelay` : gestion des timeouts et réessais HTTP
- `deduplication.storagePath` : chemin du fichier JSON de suivi des articles publiés
- `deduplication.maxStored` : nombre max d'articles en mémoire (évite la croissance infinie)
- `deduplication.ttlDays` : durée de conservation avant expiration (évite de republier les vieux articles)
- `message.embed.color` / `footer` / `timestamp` : style de l'embed Discord
- `message.embed.maxDescriptionLength` : longueur max de l'extrait (caractères)
- `sites[]` : tableau des sites (2 par défaut)
  - `name` : nom affiché en haut de l'embed
  - `url` : URL de la page à scraper
  - `enabled` : mettre `false` pour désactiver temporairement
  - `selectors.article` : sélecteur CSS d'un élément article complet
  - `selectors.title` / `link` / `description` / `image` : sélecteurs à l'intérieur de chaque article
  - `maxArticlesPerFetch` : articles maximums récupérés par cycle sur ce site

## Fonctionnement

### 1. Bannière de bienvenue

- **Déclencheur** : événement Discord `guildMemberAdd` (nouveau membre rejoint)
- **Traitement** :
  1. Récupération de l'avatar Discord du membre (format PNG, 256px)
  2. Composition de l'image : fond → overlay sombre → avatar avec bordure colorée → titre + pseudo + sous-titre
  3. Génération d'un embed avec date de création du compte, ID membre, compteur total
- **Cas d'erreur** : si l'image ne peut pas être générée, un message texte de bienvenue est envoyé en secours.

### 2. Agrégation d'actualités

- **Cycle** : planifié via `node-cron` selon `refreshInterval`
- **Récupération** : `axios` + `cheerio` parcourent le HTML de chaque site, extraient les articles selon les sélecteurs CSS
- **Dédoublonnage** : chaque article est indexé par (URL → titre normalisé) et stocké dans `data/published_articles.json`
- **Publication** : un embed Discord par article, dans l'ordre de découverte, avec une pause de 1s entre chaque message pour éviter les rate-limits
- **Robustesse** :
  - Jusqu'à 3 tentatives par requête HTTP avec backoff linéaire
  - Un site en panne n'empêche pas les autres de fonctionner (`Promise.allSettled`)
  - Le store est sauvegardé à chaque cycle, à chaque erreur et sur arrêt propre (SIGINT/SIGTERM)
  - Les articles qui échouent à la publication ne sont pas marqués comme publiés → réessayés au cycle suivant

## Structure du projet

```
bot/
├── resources_bot/              # Assets statiques (fournis initialement)
│   ├── fonts/default.ttf
│   └── images/welcome.png
├── src/
│   ├── index.js                # Point d'entrée principal
│   ├── config/
│   │   ├── index.js            # Chargeur + validateur
│   │   ├── welcome.js          # Paramètres bienvenue
│   │   └── news.js             # Paramètres actualités
│   ├── utils/
│   │   └── logger.js           # Console logger horodaté
│   └── features/
│       ├── welcome/
│       │   ├── index.js        # WelcomeHandler (écoute événement)
│       │   └── bannerGenerator.js  # Génération image via Canvas
│       └── news/
│           ├── index.js        # NewsHandler + planification cron
│           ├── scraper.js      # Récupération + parsing HTML
│           └── articleStore.js # Dédoublonnage persistant
├── data/                       # Généré à l'exécution (articles publiés)
├── package.json
├── .env.example
└── .gitignore
```

## Dépannage

### Le bot ne réagit pas aux nouveaux membres
- Vérifiez que `Server Members Intent` est activé sur https://discord.com/developers → votre bot → **Privileged Gateway Intents**.
- Vérifiez que le bot dispose bien de la permission `View Channel` et `Send Messages` dans le canal de bienvenue.
- Vérifiez les logs à la recherche de `Canal de bienvenue invalide`.

### Erreur "Missing Permissions" / 50013
Vérifiez les permissions du bot :
- `Attach Files` (pour envoyer les bannières PNG)
- `Embed Links` (pour les embeds Discord)
- `Send Messages` et `View Channel` sur chaque canal concerné

### Aucun article publié
- Lancez avec `LOG_LEVEL=debug` pour voir les détails du scraping et les erreurs de sélecteurs.
- Les sélecteurs CSS par défaut sont génériques. Il est **fortement recommandé d'ajuster** `src/config/news.js → sites[i].selectors` selon la structure HTML réelle de vos sites sources (outils : DevTools "Inspecter" → "Copy selector").
- Les 2 premiers articles récupérés sont ignorés s'ils ont déjà été vus (dédoublonnage). Attendez un vrai nouvel article sur le site.

### Taille de bannière incorrecte
Ajustez `banner.width` et `banner.height` dans `src/config/welcome.js` (ex: 900x250, 1024x380…). Pensez aussi à adapter la position des textes (`x`, `y`).

### Redémarrage et logs
Pour une mise en production durable, utilisez un gestionnaire de processus comme `pm2` :

```bash
npm install -g pm2
pm2 start src/index.js --name guilde-bot
pm2 save
pm2 startup
```

## Règles Discord / Conformité

- Ce bot utilise `discord.js` v14 stable et respecte les **rate-limits** Discord natifs.
- Pour le scraping de sites externes, assurez-vous de respecter leurs CGU, leur fichier `robots.txt` et évitez des intervalles trop agressifs (minimum 5 minutes recommandé).
- Le module d'actualités n'envoie aucun message privé (DM) et ne stocke aucun message des utilisateurs Discord.

## Licence

MIT
