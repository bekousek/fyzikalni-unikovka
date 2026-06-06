const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW = 3600;

const UPLOAD_LIMIT_MAX = 40;
const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

function buildPrompt(topic, questionCount, grade) {
    return `Jsi tvůrce vzdělávacích únikových her pro české školy. Vygeneruj přesně ${questionCount} úloh na téma: "${topic}"${grade ? ` pro ${grade}` : ''}.

Každá úloha má pole "t" (krátký název), "d" (zadání pro žáky) a "y" (typ úlohy). Podle typu přidej další pole:
- "c" Výběr z možností: "o" = pole přesně 4 možností, "c" = index správné odpovědi (0–3)
- "n" Číslo: "c" = správné číslo
- "t" Text: "c" = správná odpověď, MAXIMÁLNĚ 2 slova, jednoznačná (jméno, pojem)
- "p" Spojování dvojic: "p" = pole 3–5 dvojic [["levá","pravá"], ...], které k sobě patří
- "s" Seřazení: "s" = pole 3–5 položek ve SPRÁVNÉM pořadí (např. podle velikosti, postupu)
- "l" Časová osa: "l" = pole 3–5 dvojic [rok, "událost"], kde rok je celé číslo
- "g" Roztřídění do skupin: "g" = pole 2–3 skupin [["název skupiny", ["položka1","položka2"]], ...]
- "z" Doplňování do textu: "z" = {"text":"věta s {0} a {1}", "a":["odpověď0","odpověď1"]} — pro vynechaná slova použij {0},{1}…

PRAVIDLA:
- Úlohy musí být vzdělávací, zábavné a vhodné pro žáky
- Používej RŮZNÉ typy úloh (klidně více typů), které se hodí k tématu a věku
- U typu "z" musí počet značek {n} v textu přesně odpovídat délce pole "a"
- Pole "h" (nápověda) VŽDY vynech, NIKDY ho nezahrnuj
- Všechny texty piš česky

Odpověz POUZE validním JSON polem (bez markdown, bez vysvětlení):
[
  {"t": "Název", "d": "Zadání pro žáky", "y": "c", "o": ["A","B","C","D"], "c": 0}
]`;
}

async function callGroq(prompt, apiKey) {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
                { role: 'system', content: 'Odpovídej POUZE validním JSON polem. Žádný markdown, žádný text kolem.' },
                { role: 'user', content: prompt },
            ],
            temperature: 0.8,
            max_tokens: 4096,
            response_format: { type: 'json_object' },
        }),
    });

    if (!res.ok) {
        const errText = await res.text();
        let detail = '';
        try { detail = JSON.parse(errText).error?.message || ''; } catch {}
        throw new Error(`Groq API chyba (${res.status}). ${detail}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content;
}

async function callGemini(prompt, apiKey, model) {
    const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.8,
                    maxOutputTokens: 4096,
                    responseMimeType: 'application/json',
                },
            }),
        }
    );

    if (!res.ok) {
        const errText = await res.text();
        let detail = '';
        try { detail = JSON.parse(errText).error?.message || ''; } catch {}
        throw new Error(`Gemini API chyba (${res.status}). ${detail}`);
    }

    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text;
}

// Ověří a očistí jednu úlohu podle jejího typu. Neplatnou vrátí jako null (zahodí se).
function sanitizeQuestion(q) {
    if (!q || typeof q !== 'object') return null;
    const out = {
        t: String(q.t || '').slice(0, 200),
        d: String(q.d || '').slice(0, 1000),
        y: ['c', 'n', 't', 'p', 's', 'l', 'g', 'z'].includes(q.y) ? q.y : 'c',
    };
    if (!out.t || !out.d) return null;

    if (out.y === 'c') {
        out.o = Array.isArray(q.o) ? q.o.slice(0, 4).map(o => String(o).slice(0, 200)).filter(o => o.trim()) : [];
        if (out.o.length < 2) return null;
        out.c = typeof q.c === 'number' && q.c >= 0 && q.c < out.o.length ? q.c : 0;
    } else if (out.y === 'n') {
        const num = Number(q.c);
        if (isNaN(num)) return null;
        out.c = num;
    } else if (out.y === 't') {
        const s = String(q.c == null ? '' : q.c).trim();
        if (!s) return null;
        out.c = s.slice(0, 80);
    } else if (out.y === 'p') {
        const pairs = Array.isArray(q.p)
            ? q.p.filter(p => Array.isArray(p) && String(p[0]).trim() && String(p[1]).trim())
                .slice(0, 6).map(p => [String(p[0]).slice(0, 120), String(p[1]).slice(0, 120)])
            : [];
        if (pairs.length < 2) return null;
        out.p = pairs;
    } else if (out.y === 's') {
        const seq = Array.isArray(q.s) ? q.s.map(s => String(s).slice(0, 120)).filter(s => s.trim()).slice(0, 6) : [];
        if (seq.length < 2) return null;
        out.s = seq;
    } else if (out.y === 'l') {
        const l = Array.isArray(q.l)
            ? q.l.filter(e => Array.isArray(e) && String(e[1]).trim() && String(e[0]).trim() !== '' && !isNaN(Number(e[0])))
                .slice(0, 6).map(e => [Number(e[0]), String(e[1]).slice(0, 120)])
            : [];
        if (l.length < 2) return null;
        out.l = l;
    } else if (out.y === 'g') {
        const g = Array.isArray(q.g)
            ? q.g.filter(c => Array.isArray(c) && String(c[0]).trim() && Array.isArray(c[1]))
                .slice(0, 3).map(c => [String(c[0]).slice(0, 80), c[1].map(it => String(it).slice(0, 80)).filter(Boolean)])
            : [];
        if (g.length < 2 || g.some(c => c[1].length === 0)) return null;
        out.g = g;
    } else if (out.y === 'z') {
        const z = q.z && typeof q.z === 'object' ? q.z : null;
        if (!z || !Array.isArray(z.a) || z.a.length < 1 || !/\{\d+\}/.test(String(z.text || ''))) return null;
        out.z = { text: String(z.text).slice(0, 800), a: z.a.map(a => String(a).slice(0, 80)) };
    }
    return out;
}

// Servíruje obrázek uložený v R2 podle klíče v cestě /img/<key>.
async function serveImage(url, env) {
    if (!env.IMAGES) return new Response('Storage not configured', { status: 404 });
    const key = decodeURIComponent(url.pathname.slice('/img/'.length));
    if (!key || key.includes('..') || key.includes('/')) {
        return new Response('Not found', { status: 404 });
    }
    const obj = await env.IMAGES.get(key);
    if (!obj) return new Response('Not found', { status: 404 });
    const headers = new Headers();
    obj.writeHttpMetadata(headers);
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    headers.set('Access-Control-Allow-Origin', '*');
    if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/octet-stream');
    return new Response(obj.body, { headers });
}

// Přijme obrázek (raw tělo s Content-Type image/*), uloží do R2 a vrátí veřejnou URL.
async function handleUpload(request, url, env) {
    const json = (data, status = 200) => new Response(JSON.stringify(data), {
        status,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });

    if (!env.IMAGES) return json({ error: 'Úložiště obrázků není nakonfigurováno.' }, 500);

    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    if (env.RATE_LIMIT) {
        const key = `upload:${ip}`;
        const current = parseInt(await env.RATE_LIMIT.get(key) || '0');
        if (current >= UPLOAD_LIMIT_MAX) {
            return json({ error: 'Příliš mnoho nahrávání. Zkuste to za chvíli.' }, 429);
        }
        await env.RATE_LIMIT.put(key, String(current + 1), { expirationTtl: RATE_LIMIT_WINDOW });
    }

    const contentType = (request.headers.get('Content-Type') || '').split(';')[0].trim().toLowerCase();
    if (!ALLOWED_IMAGE_TYPES.includes(contentType)) {
        return json({ error: 'Povolené formáty: JPG, PNG, WEBP, GIF.' }, 415);
    }

    const buf = await request.arrayBuffer();
    if (buf.byteLength === 0) return json({ error: 'Prázdný soubor.' }, 400);
    if (buf.byteLength > MAX_IMAGE_BYTES) return json({ error: 'Obrázek je větší než 2 MB.' }, 413);

    const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' }[contentType];
    const key = `${crypto.randomUUID()}.${ext}`;
    await env.IMAGES.put(key, buf, { httpMetadata: { contentType } });

    return json({ url: `${url.origin}/img/${key}` });
}

export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: CORS_HEADERS });
        }

        // Servírování nahraných obrázků z R2
        if (request.method === 'GET' && url.pathname.startsWith('/img/')) {
            return serveImage(url, env);
        }

        // Nahrání obrázku do R2
        if (request.method === 'POST' && url.pathname === '/upload') {
            return handleUpload(request, url, env);
        }

        if (request.method !== 'POST') {
            return new Response(JSON.stringify({ error: 'Method not allowed' }), {
                status: 405,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
            });
        }

        const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
        const rateLimitKey = `rate:${ip}`;

        if (env.RATE_LIMIT) {
            const current = parseInt(await env.RATE_LIMIT.get(rateLimitKey) || '0');
            if (current >= RATE_LIMIT_MAX) {
                return new Response(JSON.stringify({ error: 'Příliš mnoho požadavků. Zkuste to za chvíli.' }), {
                    status: 429,
                    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                });
            }
            await env.RATE_LIMIT.put(rateLimitKey, String(current + 1), { expirationTtl: RATE_LIMIT_WINDOW });
        }

        let body;
        try {
            body = await request.json();
        } catch {
            return new Response(JSON.stringify({ error: 'Neplatný požadavek' }), {
                status: 400,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
            });
        }

        const { topic, questionCount = 4, grade = '' } = body;

        if (!topic || topic.length > 200) {
            return new Response(JSON.stringify({ error: 'Zadejte téma (max 200 znaků)' }), {
                status: 400,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
            });
        }

        const count = Math.min(10, Math.max(1, parseInt(questionCount) || 4));
        const prompt = buildPrompt(topic, count, grade);

        const groqKey = env.GROQ_API_KEY;
        const geminiKey = env.GEMINI_API_KEY;

        if (!groqKey && !geminiKey) {
            return new Response(JSON.stringify({ error: 'API klíč není nakonfigurován' }), {
                status: 500,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
            });
        }

        try {
            let text;

            if (groqKey) {
                text = await callGroq(prompt, groqKey);
            } else {
                const model = env.GEMINI_MODEL || 'gemini-2.0-flash';
                text = await callGemini(prompt, geminiKey, model);
            }

            if (!text) {
                return new Response(JSON.stringify({ error: 'AI nevrátila odpověď. Zkuste to znovu.' }), {
                    status: 502,
                    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                });
            }

            const jsonStr = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
            let parsed = JSON.parse(jsonStr);

            const questions = Array.isArray(parsed) ? parsed : (parsed.questions || parsed.q || Object.values(parsed)[0]);

            if (!Array.isArray(questions) || questions.length === 0) {
                return new Response(JSON.stringify({ error: 'AI vygenerovala neplatná data. Zkuste to znovu.' }), {
                    status: 502,
                    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                });
            }

            const validated = questions.slice(0, 10).map(sanitizeQuestion).filter(Boolean);

            if (validated.length === 0) {
                return new Response(JSON.stringify({ error: 'AI vygenerovala neplatná data. Zkuste to znovu.' }), {
                    status: 502,
                    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                });
            }

            return new Response(JSON.stringify({ questions: validated }), {
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
            });
        } catch (err) {
            console.error('Worker error:', err);
            return new Response(JSON.stringify({ error: err.message || 'Chyba při generování. Zkuste to znovu.' }), {
                status: 502,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
            });
        }
    },
};
