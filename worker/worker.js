const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW = 3600;

function buildPrompt(topic, questionCount, grade) {
    return `Jsi tvůrce vzdělávacích únikových her pro české školy. Vygeneruj přesně ${questionCount} otázek na téma: "${topic}"${grade ? ` pro ${grade}` : ''}.

PRAVIDLA:
- Otázky musí být vzdělávací, zábavné a vhodné pro žáky
- Používej různé typy odpovědí: "c" (výběr z možností), "n" (číslo), "t" (text)
- U typu "c" vždy uveď přesně 4 možnosti
- U typu "c" je "c" index správné odpovědi (0-3)
- U typu "n" je "c" správné číslo
- U typu "t" je "c" správný text — MAXIMÁLNĚ 2 slova, musí to být přesná jednoznačná odpověď (např. jméno, pojem, číslo slovem). NIKDY ne věta ani delší fráze!
- Nápověda "h" NESMÍ obsahovat odpověď ani ji prozrazovat. Nápověda má být krátký tip, který žáka nasměruje správným směrem (např. "Vzpomeň si na periodickou tabulku" nebo "Souvisí to s rokem 1918"). Pokud nevíš jak napsat nápovědu bez prozrazení odpovědi, pole "h" vynech.
- Všechny texty piš česky

Odpověz POUZE validním JSON polem (bez markdown, bez vysvětlení):
[
  {
    "t": "Název otázky",
    "d": "Podrobné zadání úlohy pro žáky",
    "h": "Nápověda — nasměrování, NE odpověď (nepovinné)",
    "y": "c",
    "o": ["Možnost A", "Možnost B", "Možnost C", "Možnost D"],
    "c": 0
  }
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

export default {
    async fetch(request, env) {
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: CORS_HEADERS });
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

            const validated = questions.slice(0, 10).map(q => {
                const out = {
                    t: String(q.t || '').slice(0, 200),
                    d: String(q.d || '').slice(0, 1000),
                    y: ['c', 'n', 't'].includes(q.y) ? q.y : 'c',
                    c: q.c,
                };
                if (q.h) out.h = String(q.h).slice(0, 200);
                if (out.y === 'c') {
                    out.o = Array.isArray(q.o) ? q.o.slice(0, 4).map(o => String(o).slice(0, 200)) : ['A', 'B', 'C', 'D'];
                    out.c = typeof q.c === 'number' && q.c >= 0 && q.c <= 3 ? q.c : 0;
                }
                return out;
            });

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
