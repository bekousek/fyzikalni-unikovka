# Nasazení AI Workeru (Cloudflare + Gemini)

## 1. Gemini API klíč (zdarma)

1. Jdi na https://aistudio.google.com/apikey
2. Přihlas se Google účtem
3. Klikni **Create API Key**
4. Zkopíruj klíč (začíná `AIza...`)

## 2. Cloudflare Worker (zdarma)

### Varianta A: Přes dashboard (jednodušší)

1. Vytvoř si účet na https://dash.cloudflare.com (nepotřebuješ kartu)
2. V levém menu klikni **Workers & Pages**
3. Klikni **Create** > **Create Worker**
4. Pojmenuj ho `unikovky-ai`
5. Klikni **Deploy** (s defaultním kódem)
6. Po deployi klikni **Edit Code**
7. Smaž defaultní kód a vlož obsah souboru `worker.js`
8. Klikni **Deploy**
9. Jdi zpět na overview workeru > **Settings** > **Variables and Secrets**
10. Klikni **Add** > typ **Secret** > název `GEMINI_API_KEY` > hodnota = tvůj API klíč
11. Ulož

### Varianta B: Přes CLI

```bash
npm install -g wrangler
wrangler login
wrangler deploy
wrangler secret put GEMINI_API_KEY
# vložíš svůj Gemini API klíč
```

## 3. Aktualizuj URL ve frontendu

V souboru `app.js` na prvním řádku uprav URL:

```javascript
const AI_WORKER_URL = 'https://unikovky-ai.TVUJ-UCET.workers.dev';
```

Nahraď `TVUJ-UCET` za tvůj Cloudflare subdomain (vidíš ho v dashboardu).

## 4. (Nepovinné) Rate limiting

Pro rate limiting vytvoř KV namespace:
1. V dashboardu: **Workers & Pages** > **KV** > **Create a namespace** > pojmenuj `unikovky-rate-limit`
2. Zkopíruj ID namespace
3. V nastavení workeru: **Settings** > **Bindings** > **Add** > **KV Namespace**
   - Variable name: `RATE_LIMIT`
   - KV namespace: vyber vytvořený namespace

Bez KV namespace worker funguje, jen nebude mít rate limiting.

## Limity free tieru

- **Gemini**: 15 požadavků/minutu, 1500/den
- **Cloudflare Workers**: 100 000 požadavků/den
- Pro pár učitelů denně to bohatě stačí
