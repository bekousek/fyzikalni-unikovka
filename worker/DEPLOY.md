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

## 5. (Nepovinné) Nahrávání obrázků přes R2

Aby šlo k úlohám nahrávat obrázky, vytvoř R2 bucket a připoj ho k workeru.

### Přes dashboard
1. V dashboardu: **R2** > **Create bucket** > název `unikovky-images` > **Create**
   - (R2 má free tier: 10 GB úložiště, bez poplatků za stažení. Aktivace R2 může vyžadovat ověření účtu kartou, samotné používání ve free limitu je zdarma.)
2. V nastavení workeru: **Settings** > **Bindings** > **Add** > **R2 bucket**
   - Variable name: `IMAGES`
   - R2 bucket: vyber `unikovky-images`

### Přes CLI / wrangler.toml
V `wrangler.toml` odkomentuj:
```toml
[[r2_buckets]]
binding = "IMAGES"
bucket_name = "unikovky-images"
```
a vytvoř bucket:
```bash
wrangler r2 bucket create unikovky-images
wrangler deploy
```

Obrázky se nahrávají přes `POST /upload` (max 2 MB, JPG/PNG/WEBP/GIF) a servírují přes
`GET /img/<klíč>` ze stejné domény workeru – do odkazu na únikovku se ukládá jen krátká URL.
Bez R2 bindingu únikovka funguje, jen nepůjde nahrávat obrázky.

## Limity free tieru

- **Gemini**: 15 požadavků/minutu, 1500/den
- **Cloudflare Workers**: 100 000 požadavků/den
- Pro pár učitelů denně to bohatě stačí
