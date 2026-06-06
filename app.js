// ====== AI CONFIG ======
const AI_WORKER_URL = 'https://unikovky-ai.ondrejbek8.workers.dev';

// ====== FIREBASE CONFIG ======
const firebaseConfig = FIREBASE_CONFIG;

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ====== ENCODING / DECODING (for share URLs) ======
function encodeRoom(config) {
    const json = JSON.stringify(config);
    const utf8 = new TextEncoder().encode(json);
    let binary = '';
    for (let i = 0; i < utf8.length; i++) binary += String.fromCharCode(utf8[i]);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeRoom(str) {
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) str += '=';
    const binary = atob(str);
    const utf8 = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) utf8[i] = binary.charCodeAt(i);
    return JSON.parse(new TextDecoder().decode(utf8));
}

// ====== AUTH ======
let currentUser = null;
let guestMode = false;

auth.onAuthStateChanged(user => {
    currentUser = user;
    if (user) {
        guestMode = false;
        updateUserUI(user);
    }
    route();
});

function signInWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch(err => {
        console.error('Sign-in error:', err);
        alert('Přihlášení se nezdařilo. Zkuste to znovu.');
    });
}

function continueAsGuest() {
    guestMode = true;
    currentUser = null;
    route();
}

function signOut() {
    guestMode = false;
    auth.signOut();
}

function isLoggedIn() {
    return currentUser || guestMode;
}

function updateUserUI(user) {
    const el = document.getElementById('user-info');
    if (!el) return;
    if (guestMode) {
        el.innerHTML = `
            <span class="user-name">Bez přihlášení</span>
            <button class="btn-logout" onclick="signInWithGoogle()">Přihlásit se</button>
        `;
    } else if (user) {
        el.innerHTML = `
            <img class="user-avatar" src="${user.photoURL || ''}" alt="" referrerpolicy="no-referrer">
            <span class="user-name">${escapeHtml(user.displayName || user.email)}</span>
            <button class="btn-logout" onclick="signOut()">Odhlásit</button>
        `;
    }
}

// ====== FIRESTORE HELPERS ======
function roomsCollection() {
    return db.collection('users').doc(currentUser.uid).collection('rooms');
}

async function loadRooms() {
    const snap = await roomsCollection().orderBy('number', 'asc').get();
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function saveRoom(roomData) {
    if (roomData.id) {
        await roomsCollection().doc(roomData.id).update({
            config: roomData.config,
            theme: roomData.theme,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        return roomData.id;
    } else {
        const rooms = await loadRooms();
        const nextNum = rooms.length > 0 ? Math.max(...rooms.map(r => r.number || 0)) + 1 : 1;
        const ref = await roomsCollection().add({
            number: nextNum,
            config: roomData.config,
            theme: roomData.theme,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        return ref.id;
    }
}

async function deleteRoomFromDB(docId) {
    await roomsCollection().doc(docId).delete();
}

// ====== ROUTER ======
const router = {
    go(path) {
        window.location.hash = path;
    }
};

function route() {
    const hash = window.location.hash || '#/';
    const path = hash.slice(1);

    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));

    if (path.startsWith('/play/')) {
        const encoded = path.slice(6);
        try {
            const config = decodeRoom(encoded);
            initGame(config);
        } catch (e) {
            alert('Neplatný odkaz na únikovku.');
            router.go('/');
        }
        return;
    }

    if (!isLoggedIn()) {
        document.getElementById('screen-login').classList.add('active');
        return;
    }

    if (path === '/create') {
        showEditor();
    } else if (path.startsWith('/edit/')) {
        const docId = path.slice(6);
        showEditor(docId);
    } else if (path === '/share') {
        document.getElementById('screen-share').classList.add('active');
    } else {
        showDashboard();
    }
}

window.addEventListener('hashchange', route);

// ====== DASHBOARD ======
function showDashboard() {
    document.getElementById('screen-dashboard').classList.add('active');
    updateUserUI(currentUser);
    renderRoomsList();
}

async function renderRoomsList() {
    const list = document.getElementById('rooms-list');
    const empty = document.getElementById('empty-state');
    const loading = document.getElementById('rooms-loading');

    list.style.display = 'none';
    empty.style.display = 'none';
    loading.style.display = 'none';

    if (guestMode) {
        empty.style.display = 'block';
        empty.querySelector('h2').textContent = 'Režim bez přihlášení';
        empty.querySelector('p').textContent = 'Vytvořené únikovky se neukládají. Pro uložení se přihlaste Google účtem.';
        return;
    }

    loading.style.display = 'block';

    try {
        const rooms = await loadRooms();

        loading.style.display = 'none';

        if (rooms.length === 0) {
            empty.style.display = 'block';
            return;
        }

        list.style.display = 'grid';
        list.innerHTML = rooms.map(room => {
            const theme = THEMES[room.theme] || THEMES.physics;
            const num = String(room.number || 0).padStart(3, '0');
            const date = room.createdAt?.toDate ? room.createdAt.toDate().toLocaleDateString('cs-CZ') : '';
            const taskCount = room.config.q.length;
            const url = buildShareUrl(room.config);

            return `
            <div class="room-card">
                <span class="room-card-number">#${num}</span>
                <div class="room-card-header">
                    <span class="room-card-icon">${theme.icon}</span>
                    <span class="room-card-title">${escapeHtml(room.config.t)}</span>
                </div>
                <div class="room-card-meta">${theme.name} · ${taskCount} úloh · ${date}</div>
                <div class="room-card-actions">
                    <button class="btn-card-copy" onclick="copyUrl('${escapeAttr(url)}', this)">Kopírovat odkaz</button>
                    <button onclick="previewFromDash('${escapeAttr(room.id)}')">Vyzkoušet</button>
                    <button onclick="editRoom('${escapeAttr(room.id)}')">Upravit</button>
                    <button class="btn-card-delete" onclick="deleteRoom('${escapeAttr(room.id)}')">Smazat</button>
                </div>
            </div>`;
        }).join('');
    } catch (err) {
        loading.style.display = 'none';
        list.style.display = 'none';
        empty.style.display = 'block';
        console.error('Error loading rooms:', err);
    }
}

function buildShareUrl(config) {
    const encoded = encodeRoom(config);
    const base = window.location.origin + window.location.pathname;
    return base + '#/play/' + encoded;
}

function copyUrl(url, btn) {
    navigator.clipboard.writeText(url).then(() => {
        const orig = btn.textContent;
        btn.textContent = 'Zkopírováno!';
        setTimeout(() => btn.textContent = orig, 2000);
    });
}

async function previewFromDash(docId) {
    const doc = await roomsCollection().doc(docId).get();
    if (!doc.exists) return;
    const encoded = encodeRoom(doc.data().config);
    window.open('#/play/' + encoded, '_blank');
}

function editRoom(docId) {
    router.go('/edit/' + docId);
}

async function deleteRoom(docId) {
    if (!confirm('Opravdu chcete smazat tuto únikovku?')) return;
    await deleteRoomFromDB(docId);
    renderRoomsList();
}

// ====== EDITOR ======
let editorState = {
    theme: 'physics',
    questions: [],
    editingId: null
};

async function showEditor(editDocId) {
    document.getElementById('screen-editor').classList.add('active');

    if (editDocId && !guestMode && currentUser) {
        try {
            const doc = await roomsCollection().doc(editDocId).get();
            if (doc.exists) {
                const data = doc.data();
                editorState.theme = data.config.e;
                editorState.editingId = editDocId;
                document.getElementById('room-title').value = data.config.t;
                document.getElementById('editor-title').textContent = `Upravit #${String(data.number || 0).padStart(3, '0')}`;
                editorState.questions = data.config.q.map(fromConfigQuestion);
                renderThemePicker();
                renderQuestions();
                return;
            }
        } catch (e) {
            console.error('Error loading room for edit:', e);
        }
    }

    editorState.theme = 'physics';
    editorState.questions = [];
    editorState.editingId = null;
    document.getElementById('room-title').value = '';
    document.getElementById('editor-title').textContent = 'Nová únikovka';
    renderThemePicker();
    renderQuestions();
}

function renderThemePicker() {
    const picker = document.getElementById('theme-picker');
    picker.innerHTML = Object.values(THEMES).map(theme => `
        <div class="theme-card ${editorState.theme === theme.id ? 'selected' : ''}" onclick="selectTheme('${theme.id}')">
            <div class="theme-card-icon">${theme.icon}</div>
            <div class="theme-card-name">${theme.name}</div>
        </div>
    `).join('');
}

function selectTheme(id) {
    editorState.theme = id;
    renderThemePicker();
}

function addQuestion() {
    if (editorState.questions.length >= 10) return;
    editorState.questions.push({
        title: '',
        description: '',
        hint: '',
        type: 'c',
        options: ['', '', '', ''],
        correct: 0
    });
    renderQuestions();
    const list = document.getElementById('questions-list');
    list.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function removeQuestion(index) {
    editorState.questions.splice(index, 1);
    renderQuestions();
}

function renderQuestions() {
    const list = document.getElementById('questions-list');
    document.getElementById('task-count').textContent = `(${editorState.questions.length}/10)`;
    document.getElementById('add-question-btn').style.display = editorState.questions.length >= 10 ? 'none' : '';

    list.innerHTML = editorState.questions.map((q, i) => `
        <div class="question-card" data-index="${i}">
            <div class="question-card-header">
                <span class="question-number">Otázka ${i + 1}</span>
                <button class="question-remove" onclick="removeQuestion(${i})" title="Odebrat">&times;</button>
            </div>
            <div class="field-group">
                <label class="field-label">Název / nadpis otázky</label>
                <input type="text" class="input-small" placeholder="např. Newtonův zákon síly" value="${escapeAttr(q.title)}" onchange="updateQ(${i},'title',this.value)">
            </div>
            <div class="field-group">
                <label class="field-label">Zadání úlohy</label>
                <textarea class="input-small" placeholder="Popište úlohu, kterou mají žáci vyřešit..." onchange="updateQ(${i},'description',this.value)">${escapeHtml(q.description)}</textarea>
            </div>
            <div class="field-group">
                <label class="field-label">Nápověda (nepovinné)</label>
                <input type="text" class="input-small" placeholder="Krátká nápověda pro žáky..." value="${escapeAttr(q.hint)}" onchange="updateQ(${i},'hint',this.value)">
            </div>
            <div class="field-group">
                <label class="field-label">Obrázek k úloze (nepovinné)</label>
                ${renderImageField(i, q)}
            </div>
            <div class="field-group">
                <label class="field-label">Typ úlohy</label>
                <select class="input-small type-select" onchange="setQType(${i}, this.value)">
                    ${Object.entries(TASK_TYPES).map(([val, label]) =>
                        `<option value="${val}" ${q.type === val ? 'selected' : ''}>${label}</option>`).join('')}
                </select>
            </div>
            ${renderQTypeFields(i, q)}
        </div>
    `).join('');
}

function renderImageField(i, q) {
    if (q.image) {
        return `<div class="image-field">
            <img class="image-preview" src="${escapeAttr(q.image)}" alt="náhled">
            <button class="btn-add-row image-remove" onclick="removeQImage(${i})">Odebrat obrázek</button>
        </div>`;
    }
    return `<div class="image-field">
        <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" class="image-input" onchange="onQImageSelect(${i}, this)">
        <span class="image-status" id="image-status-${i}"></span>
    </div>`;
}

function renderQTypeFields(i, q) {
    switch (q.type) {
        case 'c': return renderChoiceFields(i, q);
        case 'n': return renderNumberField(i, q);
        case 't': return renderTextField(i, q);
        case 'p': return renderPairsFields(i, q);
        case 's': return renderSequenceFields(i, q);
        case 'l': return renderTimelineFields(i, q);
        case 'g': return renderGroupsFields(i, q);
        case 'z': return renderClozeFields(i, q);
        default: return '';
    }
}

function renderChoiceFields(i, q) {
    return `
        <div class="field-group">
            <label class="field-label">Možnosti (označte správnou odpověď)</label>
            <div class="options-grid">
                ${q.options.map((opt, oi) => `
                    <div class="option-row">
                        <input type="radio" class="option-radio" name="correct-${i}" ${q.correct === oi ? 'checked' : ''} onchange="updateQ(${i},'correct',${oi})">
                        <input type="text" class="input-small" placeholder="Možnost ${String.fromCharCode(65 + oi)}" value="${escapeAttr(opt)}" onchange="updateOption(${i},${oi},this.value)">
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function renderNumberField(i, q) {
    return `
        <div class="field-group">
            <label class="field-label">Správná odpověď (číslo)</label>
            <input type="number" class="input-small" placeholder="např. 7" value="${q.correct || ''}" onchange="updateQ(${i},'correct',parseFloat(this.value))" step="any">
        </div>
    `;
}

function renderTextField(i, q) {
    return `
        <div class="field-group">
            <label class="field-label">Správná odpověď (text, bez ohledu na velká/malá písmena)</label>
            <input type="text" class="input-small" placeholder="např. Newton" value="${escapeAttr(q.correct || '')}" onchange="updateQ(${i},'correct',this.value)">
        </div>
    `;
}

// ---- Spojování dvojic (p) ----
function renderPairsFields(i, q) {
    const pairs = q.pairs || [];
    return `
        <div class="field-group">
            <label class="field-label">Dvojice, které k sobě patří (žák je bude spojovat)</label>
            <div class="pairs-editor">
                ${pairs.map((p, pi) => `
                    <div class="pair-edit-row">
                        <input type="text" class="input-small" placeholder="Levá" value="${escapeAttr(p[0])}" onchange="updatePair(${i},${pi},0,this.value)">
                        <span class="pair-link">↔</span>
                        <input type="text" class="input-small" placeholder="Pravá" value="${escapeAttr(p[1])}" onchange="updatePair(${i},${pi},1,this.value)">
                        <button class="row-remove" onclick="removePair(${i},${pi})" title="Odebrat">&times;</button>
                    </div>
                `).join('')}
            </div>
            <button class="btn-add-row" onclick="addPair(${i})">+ Přidat dvojici</button>
        </div>
    `;
}

// ---- Seřazení / pořadí (s) ----
function renderSequenceFields(i, q) {
    const seq = q.seq || [];
    return `
        <div class="field-group">
            <label class="field-label">Položky ve <strong>správném pořadí</strong> (shora dolů) – žákovi se zamíchají</label>
            <div class="seq-editor">
                ${seq.map((s, si) => `
                    <div class="seq-edit-row">
                        <span class="seq-num">${si + 1}.</span>
                        <input type="text" class="input-small" placeholder="Položka" value="${escapeAttr(s)}" onchange="updateSeq(${i},${si},this.value)">
                        <button class="row-remove" onclick="removeSeqItem(${i},${si})" title="Odebrat">&times;</button>
                    </div>
                `).join('')}
            </div>
            <button class="btn-add-row" onclick="addSeqItem(${i})">+ Přidat položku</button>
        </div>
    `;
}

// ---- Časová osa (l) ----
function renderTimelineFields(i, q) {
    const tl = q.tl || [];
    return `
        <div class="field-group">
            <label class="field-label">Události a roky – seřadí se podle roku automaticky, žákovi se zamíchají</label>
            <div class="seq-editor">
                ${tl.map((t, ti) => `
                    <div class="tl-edit-row">
                        <input type="number" class="input-small tl-year" placeholder="Rok" value="${t[0] === '' || t[0] == null ? '' : t[0]}" onchange="updateTl(${i},${ti},0,this.value)">
                        <input type="text" class="input-small" placeholder="Událost" value="${escapeAttr(t[1])}" onchange="updateTl(${i},${ti},1,this.value)">
                        <button class="row-remove" onclick="removeTlItem(${i},${ti})" title="Odebrat">&times;</button>
                    </div>
                `).join('')}
            </div>
            <button class="btn-add-row" onclick="addTlItem(${i})">+ Přidat událost</button>
        </div>
    `;
}

// ---- Roztřídění do skupin (g) ----
function renderGroupsFields(i, q) {
    const groups = q.groups || [];
    return `
        <div class="field-group">
            <label class="field-label">Skupiny a jejich položky (položky oddělte čárkou) – žákovi se zamíchají</label>
            <div class="groups-editor">
                ${groups.map((g, gi) => `
                    <div class="group-edit-row">
                        <input type="text" class="input-small group-name" placeholder="Název skupiny" value="${escapeAttr(g.name)}" onchange="updateGroupName(${i},${gi},this.value)">
                        <input type="text" class="input-small" placeholder="Položky, oddělené čárkou" value="${escapeAttr(g.itemsText)}" onchange="updateGroupItems(${i},${gi},this.value)">
                        <button class="row-remove" onclick="removeGroup(${i},${gi})" title="Odebrat">&times;</button>
                    </div>
                `).join('')}
            </div>
            <button class="btn-add-row" onclick="addGroup(${i})">+ Přidat skupinu</button>
        </div>
    `;
}

// ---- Doplňování do textu (z) ----
function renderClozeFields(i, q) {
    return `
        <div class="field-group">
            <label class="field-label">Text – slova k doplnění uzavřete do <strong>[hranatých závorek]</strong></label>
            <textarea class="input-small" rows="3" placeholder="Hlavní město Česka je [Praha] a leží na řece [Vltava]." onchange="updateCloze(${i},this.value)">${escapeHtml(q.clozeText || '')}</textarea>
        </div>
    `;
}

function updateQ(index, field, value) {
    editorState.questions[index][field] = value;
}

function updateOption(qi, oi, value) {
    editorState.questions[qi].options[oi] = value;
}

function updatePair(qi, pi, side, value) { editorState.questions[qi].pairs[pi][side] = value; }
function addPair(qi) { editorState.questions[qi].pairs.push(['', '']); renderQuestions(); }
function removePair(qi, pi) { editorState.questions[qi].pairs.splice(pi, 1); renderQuestions(); }

function updateSeq(qi, si, value) { editorState.questions[qi].seq[si] = value; }
function addSeqItem(qi) { editorState.questions[qi].seq.push(''); renderQuestions(); }
function removeSeqItem(qi, si) { editorState.questions[qi].seq.splice(si, 1); renderQuestions(); }

function updateTl(qi, ti, field, value) { editorState.questions[qi].tl[ti][field] = value; }
function addTlItem(qi) { editorState.questions[qi].tl.push(['', '']); renderQuestions(); }
function removeTlItem(qi, ti) { editorState.questions[qi].tl.splice(ti, 1); renderQuestions(); }

function updateGroupName(qi, gi, value) { editorState.questions[qi].groups[gi].name = value; }
function updateGroupItems(qi, gi, value) { editorState.questions[qi].groups[gi].itemsText = value; }
function addGroup(qi) { editorState.questions[qi].groups.push({ name: '', itemsText: '' }); renderQuestions(); }
function removeGroup(qi, gi) { editorState.questions[qi].groups.splice(gi, 1); renderQuestions(); }

function updateCloze(qi, value) { editorState.questions[qi].clozeText = value; }

// ---- Obrázek k úloze (nahrání do R2 přes worker) ----
async function uploadImage(file) {
    const res = await fetch(AI_WORKER_URL + '/upload', {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.url) throw new Error(data.error || 'Nahrání obrázku se nezdařilo.');
    return data.url;
}

async function onQImageSelect(qi, input) {
    const file = input.files && input.files[0];
    if (!file) return;
    const status = document.getElementById(`image-status-${qi}`);
    if (!file.type.startsWith('image/')) {
        if (status) status.textContent = 'Vyberte prosím obrázek.';
        return;
    }
    if (file.size > 2 * 1024 * 1024) {
        if (status) status.textContent = 'Obrázek je větší než 2 MB.';
        return;
    }
    input.disabled = true;
    if (status) status.textContent = 'Nahrávám…';
    try {
        const url = await uploadImage(file);
        editorState.questions[qi].image = url;
        renderQuestions();
    } catch (err) {
        input.disabled = false;
        if (status) status.textContent = err.message || 'Nahrání se nezdařilo.';
    }
}

function removeQImage(qi) {
    editorState.questions[qi].image = '';
    renderQuestions();
}

function setQType(index, type) {
    const q = editorState.questions[index];
    q.type = type;
    if (type === 'c') {
        q.options = q.options || ['', '', '', ''];
        q.correct = typeof q.correct === 'number' && q.correct < 4 ? q.correct : 0;
    } else if (type === 'n' || type === 't') {
        if (typeof q.correct !== 'number' && typeof q.correct !== 'string') q.correct = '';
        if (typeof q.correct === 'number' && type === 't') q.correct = '';
    } else if (type === 'p') {
        q.pairs = q.pairs && q.pairs.length ? q.pairs : [['', ''], ['', ''], ['', '']];
    } else if (type === 's') {
        q.seq = q.seq && q.seq.length ? q.seq : ['', '', ''];
    } else if (type === 'l') {
        q.tl = q.tl && q.tl.length ? q.tl : [['', ''], ['', ''], ['', '']];
    } else if (type === 'g') {
        q.groups = q.groups && q.groups.length ? q.groups : [{ name: '', itemsText: '' }, { name: '', itemsText: '' }];
    } else if (type === 'z') {
        q.clozeText = q.clozeText || '';
    }
    renderQuestions();
}

async function generateRoom() {
    const title = document.getElementById('room-title').value.trim();
    const qs = editorState.questions;

    const errors = [];
    if (!title) errors.push('Zadejte název únikovky.');
    if (qs.length < 1) errors.push('Přidejte alespoň 1 otázku.');
    if (qs.length > 10) errors.push('Maximum je 10 otázek.');

    qs.forEach((q, i) => {
        if (!q.title.trim()) errors.push(`Otázka ${i + 1}: chybí název.`);
        if (!q.description.trim()) errors.push(`Otázka ${i + 1}: chybí zadání.`);
        if (q.type === 'c') {
            const filledOpts = q.options.filter(o => o.trim());
            if (filledOpts.length < 2) errors.push(`Otázka ${i + 1}: vyplňte alespoň 2 možnosti.`);
        }
        if (q.type === 'n' && (q.correct === '' || q.correct === null || isNaN(q.correct))) {
            errors.push(`Otázka ${i + 1}: zadejte správnou číselnou odpověď.`);
        }
        if (q.type === 't' && !String(q.correct).trim()) {
            errors.push(`Otázka ${i + 1}: zadejte správnou textovou odpověď.`);
        }
        if (q.type === 'p') {
            const v = (q.pairs || []).filter(p => p[0].trim() && p[1].trim());
            if (v.length < 2) errors.push(`Otázka ${i + 1}: doplňte alespoň 2 úplné dvojice.`);
        }
        if (q.type === 's') {
            const v = (q.seq || []).filter(s => s.trim());
            if (v.length < 2) errors.push(`Otázka ${i + 1}: zadejte alespoň 2 položky k seřazení.`);
        }
        if (q.type === 'l') {
            const v = (q.tl || []).filter(t => String(t[1]).trim() && String(t[0]).trim() !== '' && !isNaN(Number(t[0])));
            if (v.length < 2) errors.push(`Otázka ${i + 1}: zadejte alespoň 2 události s rokem.`);
        }
        if (q.type === 'g') {
            const gs = (q.groups || []).filter(g => g.name.trim() && splitItems(g.itemsText).length);
            if (gs.length < 2) errors.push(`Otázka ${i + 1}: vytvořte alespoň 2 skupiny s položkami.`);
        }
        if (q.type === 'z') {
            const z = parseCloze(q.clozeText);
            if (z.a.length < 1) errors.push(`Otázka ${i + 1}: označte alespoň 1 vynechané slovo do [hranatých závorek].`);
        }
    });

    if (errors.length > 0) {
        alert(errors.join('\n'));
        return;
    }

    const btn = document.getElementById('generate-btn');
    btn.disabled = true;
    btn.textContent = 'Ukládám...';

    const code = Array.from({ length: qs.length }, () => Math.floor(Math.random() * 9) + 1).join('');

    const config = {
        t: title,
        e: editorState.theme,
        k: code,
        q: qs.map(q => {
            const out = { t: q.title.trim(), d: q.description.trim(), y: q.type };
            if (q.hint && q.hint.trim()) out.h = q.hint.trim();
            if (q.image) out.im = q.image;
            if (q.type === 'c') {
                out.o = q.options.filter(o => o.trim());
                out.c = q.correct;
            } else if (q.type === 'n' || q.type === 't') {
                out.c = q.correct;
            } else if (q.type === 'p') {
                out.p = q.pairs.filter(p => p[0].trim() && p[1].trim()).map(p => ({ l: p[0].trim(), r: p[1].trim() }));
            } else if (q.type === 's') {
                out.s = q.seq.map(s => s.trim()).filter(Boolean);
            } else if (q.type === 'l') {
                out.l = q.tl
                    .filter(t => String(t[1]).trim() && String(t[0]).trim() !== '' && !isNaN(Number(t[0])))
                    .map(t => ({ y: Number(t[0]), e: String(t[1]).trim() }));
            } else if (q.type === 'g') {
                out.g = q.groups.filter(g => g.name.trim() && splitItems(g.itemsText).length)
                    .map(g => ({ n: g.name.trim(), i: splitItems(g.itemsText) }));
            } else if (q.type === 'z') {
                out.z = parseCloze(q.clozeText);
            }
            return out;
        })
    };

    try {
        if (!guestMode && currentUser) {
            await saveRoom({
                id: editorState.editingId,
                config,
                theme: editorState.theme
            });
        }

        const url = buildShareUrl(config);
        document.getElementById('share-url').value = url;
        document.getElementById('copy-feedback').textContent = '';
        currentShareConfig = config;
        router.go('/share');
    } catch (err) {
        console.error('Error saving room:', err);
        alert('Nepodařilo se uložit únikovku. Zkuste to znovu.');
    } finally {
        btn.disabled = false;
        btn.textContent = editorState.editingId ? 'Uložit změny' : 'Vytvořit únikovku';
    }
}

let currentShareConfig = null;

function copyShareUrl() {
    const input = document.getElementById('share-url');
    navigator.clipboard.writeText(input.value).then(() => {
        document.getElementById('copy-feedback').textContent = 'Odkaz zkopírován do schránky!';
    });
}

function previewRoom() {
    if (currentShareConfig) {
        const encoded = encodeRoom(currentShareConfig);
        window.open('#/play/' + encoded, '_blank');
    }
}

// ====== GAME ENGINE ======
const TASKS_PER_ROOM = 4;

let gameState = {
    config: null,
    solved: {},
    startTime: null,
    peeksLeft: 3,
    rooms: [],
    currentRoom: 0,
    exitRoom: 0
};

function initGame(config) {
    gameState.config = config;
    gameState.solved = {};
    gameState.startTime = null;
    gameState.rooms = [];
    gameState.currentRoom = 0;

    const theme = THEMES[config.e] || THEMES.physics;

    document.getElementById('game-theme-icon').textContent = theme.icon;
    document.getElementById('game-title').textContent = config.t;
    document.getElementById('game-theme-name').textContent = theme.name;
    document.getElementById('game-task-count').textContent = config.q.length;

    document.getElementById('screen-game-intro').classList.add('active');
}

function startGame() {
    gameState.startTime = Date.now();
    gameState.peeksLeft = 3;
    document.getElementById('screen-game-intro').classList.remove('active');
    document.getElementById('screen-game-room').classList.add('active');

    const config = gameState.config;
    const theme = THEMES[config.e] || THEMES.physics;

    document.getElementById('room-header-title').textContent = `${theme.headerIcon} ${config.t}`;

    let codesHtml = '<button class="btn-peek" id="peek-btn" onclick="peekObjects()" title="Krátce zvýrazní skryté předměty v místnosti">🔍 Rozhlédnout se (<span id="peek-count">3</span>)</button>';
    codesHtml += '<span class="code-label">Kódy:</span>';
    for (let i = 0; i < config.q.length; i++) {
        codesHtml += `<span class="code-slot" id="code-${i}">?</span>`;
    }
    document.getElementById('codes-display').innerHTML = codesHtml;

    // Rozdělení úloh do místností; únikové dveře schované v jedné z nich.
    gameState.rooms = [];
    for (let i = 0; i < config.q.length; i += TASKS_PER_ROOM) {
        gameState.rooms.push(
            Array.from({ length: Math.min(TASKS_PER_ROOM, config.q.length - i) }, (_, k) => i + k)
        );
    }
    gameState.currentRoom = 0;
    // Únikové dveře jsou v poslední místnosti – hráč k nim musí projít ostatní.
    gameState.exitRoom = gameState.rooms.length - 1;

    renderCurrentRoom();
}

function allSolved() {
    return Object.keys(gameState.solved).length === gameState.config.q.length;
}

// Vykreslí aktuální místnost, obnoví stav vyřešených úloh a navigaci.
function renderCurrentRoom() {
    const config = gameState.config;
    const slotTasks = gameState.rooms[gameState.currentRoom] || [];
    const hasDoor = gameState.currentRoom === gameState.exitRoom;

    document.getElementById('room-svg-container').innerHTML =
        generateRoomSVG(config.e, slotTasks, hasDoor, gameState.currentRoom);

    document.querySelectorAll('.clickable-object').forEach(el => {
        const open = () => {
            const taskIdx = parseInt(el.dataset.task);
            if (!gameState.solved[taskIdx]) openGameTask(taskIdx);
        };
        el.addEventListener('click', open);
        el.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
        });
    });

    // Obnovit vizuál již vyřešených úloh v této místnosti
    slotTasks.forEach(gi => {
        if (gameState.solved[gi]) {
            const ind = document.querySelector(`[data-task-ind="${gi}"]`);
            if (ind) ind.setAttribute('opacity', '1');
            const obj = document.querySelector(`.clickable-object[data-task="${gi}"]`);
            if (obj) obj.classList.add('solved');
        }
    });

    // Únikové dveře
    const door = document.getElementById('exit-door');
    if (door) {
        const trigger = () => tryExitDoor();
        door.addEventListener('click', trigger);
        door.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); trigger(); }
        });
        if (allSolved()) door.classList.add('door-open');
    }

    updateRoomNav();
}

function updateRoomNav() {
    const total = gameState.rooms.length;
    const cur = gameState.currentRoom;
    const ind = document.getElementById('room-indicator');
    if (ind) ind.textContent = total > 1 ? `Místnost ${cur + 1} / ${total}` : '';
    const left = document.getElementById('room-nav-left');
    const right = document.getElementById('room-nav-right');
    if (left) left.style.display = cur > 0 ? 'flex' : 'none';
    if (right) right.style.display = cur < total - 1 ? 'flex' : 'none';
}

function navRoom(dir) {
    const next = gameState.currentRoom + dir;
    if (next < 0 || next >= gameState.rooms.length) return;
    gameState.currentRoom = next;
    renderCurrentRoom();
}

// Klik na únikové dveře: hotovo → zadání kódu, jinak hláška.
function tryExitDoor() {
    if (allSolved()) {
        showDoorLock();
    } else {
        const remaining = gameState.config.q.length - Object.keys(gameState.solved).length;
        const word = remaining === 1 ? 'úkol' : (remaining >= 2 && remaining <= 4 ? 'úkoly' : 'úkolů');
        showRoomToast(`🔒 Dveře jsou zamčené. Nejdřív vyřeš všechny úkoly (zbývá ${remaining} ${word}).`);
    }
}

let roomToastTimer = null;
function showRoomToast(msg) {
    const el = document.getElementById('room-toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(roomToastTimer);
    roomToastTimer = setTimeout(() => el.classList.remove('show'), 3200);
}

// Krátce zvýrazní dosud nevyřešené předměty (omezený počet použití).
function peekObjects() {
    if (gameState.peeksLeft <= 0) return;
    gameState.peeksLeft--;
    const cnt = document.getElementById('peek-count');
    if (cnt) cnt.textContent = gameState.peeksLeft;
    document.querySelectorAll('.clickable-object:not(.solved)').forEach(el => {
        el.classList.add('peek');
        setTimeout(() => el.classList.remove('peek'), 1600);
    });
    const door = document.getElementById('exit-door');
    if (door) {
        door.classList.add('peek');
        setTimeout(() => door.classList.remove('peek'), 1600);
    }
    if (gameState.peeksLeft <= 0) {
        const btn = document.getElementById('peek-btn');
        if (btn) btn.disabled = true;
    }
}

let taskUI = null;

function openGameTask(index) {
    const q = gameState.config.q[index];
    const theme = THEMES[gameState.config.e] || THEMES.physics;
    const obj = theme.objects[index] || { icon: '❓', label: 'Úkol' };
    taskUI = { index, type: q.y };

    let html = `<div class="task-header"><h3>${obj.icon} ${escapeHtml(q.t)}</h3></div>`;
    html += `<div class="task-description">${escapeHtml(q.d).replace(/\n/g, '<br>')}</div>`;

    if (q.im) html += `<img class="task-image" src="${escapeAttr(q.im)}" alt="">`;
    if (q.f) html += `<div class="task-formula">${escapeHtml(q.f)}</div>`;
    if (q.h) html += `<div class="task-hint">💡 ${escapeHtml(q.h)}</div>`;

    if (q.y === 'c') {
        html += '<div class="task-options">';
        const labels = ['A', 'B', 'C', 'D'];
        (q.o || []).forEach((opt, oi) => {
            const isCorrect = oi === q.c;
            html += `<div class="task-option" onclick="checkGameChoice(${index},this,${isCorrect})">${labels[oi]}) ${escapeHtml(opt)}</div>`;
        });
        html += '</div>';
    } else if (q.y === 'n') {
        html += `<div class="task-input-group">
            <input type="number" class="task-input" id="game-answer-${index}" placeholder="Zadej číslo" step="any">
            <button class="task-submit" onclick="checkGameNumber(${index})">Ověřit</button>
        </div>`;
    } else if (q.y === 't') {
        html += `<div class="task-input-group">
            <input type="text" class="task-input" id="game-answer-${index}" placeholder="Zadej odpověď">
            <button class="task-submit" onclick="checkGameText(${index})">Ověřit</button>
        </div>`;
    } else if (q.y === 'p') {
        html += renderPairsGame(index, q);
    } else if (q.y === 's') {
        taskUI.correct = (q.s || []).slice();
        html += renderOrderGame(index, shuffle(q.s || []), false);
    } else if (q.y === 'l') {
        const sorted = (q.l || []).slice().sort((a, b) => a.y - b.y);
        taskUI.correct = sorted.map(e => e.e);
        taskUI.years = {};
        (q.l || []).forEach(e => { taskUI.years[e.e] = e.y; });
        html += renderOrderGame(index, shuffle((q.l || []).map(e => e.e)), true);
    } else if (q.y === 'g') {
        taskUI.selItem = null;
        html += renderGroupsGame(index, q);
    } else if (q.y === 'z') {
        html += renderClozeGame(index, q);
    }

    html += `<div class="task-feedback" id="game-feedback-${index}"></div>`;

    document.getElementById('task-content').innerHTML = html;
    document.getElementById('task-modal').classList.add('active');

    const inputEl = document.getElementById(`game-answer-${index}`);
    if (inputEl) {
        inputEl.focus();
        inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                if (gameState.config.q[index].y === 'n') checkGameNumber(index);
                else checkGameText(index);
            }
        });
    }
}

function closeTask() {
    document.getElementById('task-modal').classList.remove('active');
}

// ====== INTERAKTIVNÍ TYPY ÚLOH (hra) ======

// --- Spojování dvojic (p) ---
function renderPairsGame(index, q) {
    const lefts = (q.p || []).map((p, i) => ({ i, text: p.l }));
    const rights = shuffle((q.p || []).map((p, i) => ({ i, text: p.r })));
    let h = '<p class="task-howto">Klikni na položku vlevo a pak na tu, která k ní patří vpravo.</p>';
    h += '<div class="pairs-grid"><div class="pairs-col">';
    h += lefts.map(l => `<button class="pair-item" data-side="l" data-pi="${l.i}" onclick="selectPair(${index},'l',${l.i},this)">${escapeHtml(l.text)}</button>`).join('');
    h += '</div><div class="pairs-col">';
    h += rights.map(r => `<button class="pair-item" data-side="r" data-pi="${r.i}" onclick="selectPair(${index},'r',${r.i},this)">${escapeHtml(r.text)}</button>`).join('');
    h += '</div></div>';
    return h;
}

function selectPair(index, side, pi, el) {
    if (gameState.solved[index] || el.classList.contains('matched')) return;
    const fb = document.getElementById(`game-feedback-${index}`);
    if (side === 'l') {
        document.querySelectorAll('.pair-item[data-side="l"].sel').forEach(e => e.classList.remove('sel'));
        taskUI.sel = pi;
        el.classList.add('sel');
        return;
    }
    if (taskUI.sel == null) {
        fb.className = 'task-feedback error';
        fb.textContent = 'Nejdřív vyber položku vlevo.';
        return;
    }
    if (taskUI.sel === pi) {
        const leftEl = document.querySelector(`.pair-item[data-side="l"][data-pi="${pi}"]`);
        if (leftEl) { leftEl.classList.remove('sel'); leftEl.classList.add('matched'); }
        el.classList.add('matched');
        taskUI.sel = null;
        fb.className = 'task-feedback';
        fb.textContent = '';
        if (document.querySelectorAll('.pair-item[data-side="l"]:not(.matched)').length === 0) {
            solveGameTask(index, fb);
        }
    } else {
        el.classList.add('wrong');
        setTimeout(() => el.classList.remove('wrong'), 600);
        document.querySelectorAll('.pair-item[data-side="l"].sel').forEach(e => e.classList.remove('sel'));
        taskUI.sel = null;
        fb.className = 'task-feedback error';
        fb.textContent = '❌ To k sobě nepatří, zkus to znovu.';
    }
}

// --- Seřazení / pořadí (s) a časová osa (l) ---
function renderOrderGame(index, labels, isTimeline) {
    let h = `<p class="task-howto">Šipkami seřaď ${isTimeline ? 'události od nejstarší po nejnovější' : 'položky do správného pořadí'}.</p>`;
    h += `<ul class="order-list" id="order-list-${index}">`;
    h += labels.map(label => `
        <li class="order-item" data-label="${escapeAttr(label)}">
            <span class="order-move">
                <button onclick="moveOrder(${index},this,-1)" title="Nahoru">▲</button>
                <button onclick="moveOrder(${index},this,1)" title="Dolů">▼</button>
            </span>
            <span class="order-text">${escapeHtml(label)}</span>
        </li>`).join('');
    h += '</ul>';
    h += `<button class="task-submit" onclick="checkGameOrder(${index})">Zkontrolovat pořadí</button>`;
    return h;
}

function moveOrder(index, btn, dir) {
    if (gameState.solved[index]) return;
    const li = btn.closest('li');
    const list = li.parentElement;
    if (dir < 0 && li.previousElementSibling) {
        list.insertBefore(li, li.previousElementSibling);
    } else if (dir > 0 && li.nextElementSibling) {
        list.insertBefore(li.nextElementSibling, li);
    }
}

function checkGameOrder(index) {
    if (gameState.solved[index]) return;
    const fb = document.getElementById(`game-feedback-${index}`);
    const current = [...document.querySelectorAll(`#order-list-${index} .order-item`)].map(li => li.dataset.label);
    const correct = taskUI.correct || [];
    const ok = current.length === correct.length && current.every((l, i) => l === correct[i]);
    if (ok) {
        document.querySelectorAll(`#order-list-${index} .order-move button`).forEach(b => b.disabled = true);
        if (taskUI.years) {
            document.querySelectorAll(`#order-list-${index} .order-item`).forEach(li => {
                const y = taskUI.years[li.dataset.label];
                if (y != null) li.querySelector('.order-text').textContent = `${y} – ${li.dataset.label}`;
            });
        }
        solveGameTask(index, fb);
    } else {
        fb.className = 'task-feedback error';
        fb.textContent = '❌ Pořadí ještě nesedí, zkus to znovu.';
    }
}

// --- Roztřídění do skupin (g) ---
function renderGroupsGame(index, q) {
    const items = shuffle((q.g || []).flatMap((g, ci) => (g.i || []).map(it => ({ label: it, ci }))));
    let h = '<p class="task-howto">Klikni na položku a pak na skupinu, kam patří.</p>';
    h += `<div class="groups-pool" id="groups-pool-${index}" onclick="returnGroupItem(${index})">`;
    h += items.map(it => `<button class="group-item" data-ci="${it.ci}" data-label="${escapeAttr(it.label)}" onclick="event.stopPropagation();selectGroupItem(${index},this)">${escapeHtml(it.label)}</button>`).join('');
    h += '</div><div class="groups-cats">';
    (q.g || []).forEach((g, ci) => {
        h += `<div class="group-cat" onclick="dropGroupItem(${index},${ci},this)">
            <div class="group-cat-name">${escapeHtml(g.n)}</div>
            <div class="group-cat-items" data-ci="${ci}"></div>
        </div>`;
    });
    h += '</div>';
    h += `<button class="task-submit" onclick="checkGameGroups(${index})">Zkontrolovat</button>`;
    return h;
}

function selectGroupItem(index, el) {
    if (gameState.solved[index]) return;
    if (taskUI.selItem === el) {
        el.classList.remove('sel');
        taskUI.selItem = null;
        return;
    }
    document.querySelectorAll('.group-item.sel').forEach(e => e.classList.remove('sel'));
    taskUI.selItem = el;
    el.classList.add('sel');
}

function dropGroupItem(index, ci, catEl) {
    if (gameState.solved[index] || !taskUI.selItem) return;
    const target = catEl.querySelector('.group-cat-items');
    taskUI.selItem.classList.remove('sel');
    target.appendChild(taskUI.selItem);
    taskUI.selItem = null;
}

function returnGroupItem(index) {
    if (gameState.solved[index] || !taskUI.selItem) return;
    document.getElementById(`groups-pool-${index}`).appendChild(taskUI.selItem);
    taskUI.selItem.classList.remove('sel');
    taskUI.selItem = null;
}

function checkGameGroups(index) {
    if (gameState.solved[index]) return;
    const fb = document.getElementById(`game-feedback-${index}`);
    const pool = document.getElementById(`groups-pool-${index}`);
    if (pool.querySelector('.group-item')) {
        fb.className = 'task-feedback error';
        fb.textContent = 'Umísti všechny položky do skupin.';
        return;
    }
    let ok = true;
    document.querySelectorAll(`#task-content .group-item`).forEach(it => {
        const placedCi = it.closest('.group-cat-items')?.dataset.ci;
        if (String(it.dataset.ci) !== String(placedCi)) ok = false;
    });
    if (ok) {
        solveGameTask(index, fb);
    } else {
        fb.className = 'task-feedback error';
        fb.textContent = '❌ Něco je ve špatné skupině, zkus to znovu.';
    }
}

// --- Doplňování do textu (z) ---
function renderClozeGame(index, q) {
    const z = q.z || { text: '', a: [] };
    const parts = String(z.text).split(/\{(\d+)\}/);
    let h = '<div class="cloze-text">';
    parts.forEach((part, k) => {
        if (k % 2 === 0) h += escapeHtml(part).replace(/\n/g, '<br>');
        else h += `<input class="cloze-input" id="cloze-${index}-${part}" autocomplete="off">`;
    });
    h += '</div>';
    const bank = shuffle((z.a || []).slice());
    if (bank.length) {
        h += '<div class="cloze-bank"><span class="cloze-bank-label">Nabídka:</span>' +
            bank.map(w => `<span class="cloze-chip">${escapeHtml(w)}</span>`).join('') + '</div>';
    }
    h += `<button class="task-submit" onclick="checkGameCloze(${index})">Zkontrolovat</button>`;
    return h;
}

function checkGameCloze(index) {
    if (gameState.solved[index]) return;
    const fb = document.getElementById(`game-feedback-${index}`);
    const z = gameState.config.q[index].z || { a: [] };
    let ok = true;
    z.a.forEach((ans, i) => {
        const input = document.getElementById(`cloze-${index}-${i}`);
        if (!input) { ok = false; return; }
        const val = input.value.trim().toLowerCase();
        const correct = String(ans).trim().toLowerCase();
        if (val === correct) {
            input.classList.remove('wrong');
            input.classList.add('correct');
        } else {
            input.classList.add('wrong');
            ok = false;
        }
    });
    if (ok) {
        document.querySelectorAll(`#task-content .cloze-input`).forEach(i => i.disabled = true);
        solveGameTask(index, fb);
    } else {
        fb.className = 'task-feedback error';
        fb.textContent = '❌ Některá slova nesedí, zkus to znovu.';
    }
}

function checkGameChoice(taskIndex, element, isCorrect) {
    if (gameState.solved[taskIndex]) return;
    const fb = document.getElementById(`game-feedback-${taskIndex}`);

    if (isCorrect) {
        element.classList.add('correct');
        element.parentElement.querySelectorAll('.task-option').forEach(o => o.style.pointerEvents = 'none');
        solveGameTask(taskIndex, fb);
    } else {
        element.classList.add('wrong');
        element.style.pointerEvents = 'none';
        fb.className = 'task-feedback error';
        fb.textContent = '❌ Špatná odpověď, zkus to znovu!';
    }
}

function checkGameNumber(taskIndex) {
    if (gameState.solved[taskIndex]) return;
    const input = document.getElementById(`game-answer-${taskIndex}`);
    const fb = document.getElementById(`game-feedback-${taskIndex}`);
    const val = parseFloat(input.value);
    const correct = parseFloat(gameState.config.q[taskIndex].c);

    if (isNaN(val)) {
        fb.className = 'task-feedback error';
        fb.textContent = '❌ Zadej prosím číslo!';
        return;
    }

    if (Math.abs(val - correct) < Math.max(0.01, Math.abs(correct) * 0.05)) {
        input.disabled = true;
        solveGameTask(taskIndex, fb);
    } else {
        fb.className = 'task-feedback error';
        fb.textContent = '❌ Špatná odpověď, zkus to znovu!';
        input.value = '';
        input.focus();
    }
}

function checkGameText(taskIndex) {
    if (gameState.solved[taskIndex]) return;
    const input = document.getElementById(`game-answer-${taskIndex}`);
    const fb = document.getElementById(`game-feedback-${taskIndex}`);
    const val = input.value.trim().toLowerCase();
    const correct = String(gameState.config.q[taskIndex].c).trim().toLowerCase();

    if (!val) {
        fb.className = 'task-feedback error';
        fb.textContent = '❌ Zadej odpověď!';
        return;
    }

    if (val === correct) {
        input.disabled = true;
        solveGameTask(taskIndex, fb);
    } else {
        fb.className = 'task-feedback error';
        fb.textContent = '❌ Špatná odpověď, zkus to znovu!';
        input.value = '';
        input.focus();
    }
}

function solveGameTask(taskIndex, fb) {
    gameState.solved[taskIndex] = true;
    const digit = gameState.config.k[taskIndex];

    fb.className = 'task-feedback success';
    fb.textContent = `✅ Správně! Kód z tohoto úkolu je: ${digit}`;

    const slot = document.getElementById(`code-${taskIndex}`);
    if (slot) {
        slot.textContent = digit;
        slot.classList.add('solved');
    }

    const indicator = document.querySelector(`[data-task-ind="${taskIndex}"]`);
    if (indicator) {
        indicator.setAttribute('opacity', '1');
    }

    const obj = document.querySelector(`.clickable-object[data-task="${taskIndex}"]`);
    if (obj) obj.classList.add('solved');

    if (allSolved()) {
        // Všechno hotovo – upozornit hráče, ať najde únikové dveře.
        const door = document.getElementById('exit-door');
        if (door) door.classList.add('door-open');
        const where = gameState.currentRoom === gameState.exitRoom
            ? 'Únikové dveře jsou v této místnosti.'
            : 'Najdi v místnostech únikové dveře.';
        setTimeout(() => showRoomToast(`🎉 Všechny úkoly vyřešené! ${where} Klikni na ně a zadej kód.`), 400);
    }
}

function showDoorLock() {
    document.getElementById('door-lock-modal').classList.add('active');
    const input = document.getElementById('lock-input');
    input.value = '';
    input.maxLength = gameState.config.k.length;
    document.getElementById('lock-message').textContent = '';
    input.focus();
}

function closeDoorLock() {
    document.getElementById('door-lock-modal').classList.remove('active');
}

function tryUnlock() {
    const input = document.getElementById('lock-input');
    const msg = document.getElementById('lock-message');
    const val = input.value.trim();

    if (val === gameState.config.k) {
        msg.className = 'lock-message success';
        msg.textContent = '✅ Kód je správný! Dveře se otevírají...';
        setTimeout(() => {
            closeDoorLock();
            document.getElementById('screen-game-room').classList.remove('active');
            showVictory();
        }, 1200);
    } else {
        msg.className = 'lock-message error';
        msg.textContent = '❌ Špatný kód! Zkontroluj pořadí číslic.';
        input.value = '';
        input.focus();
    }
}

function showVictory() {
    document.getElementById('screen-victory').classList.add('active');
    const elapsed = Math.floor((Date.now() - gameState.startTime) / 1000);
    const min = Math.floor(elapsed / 60);
    const sec = elapsed % 60;
    const theme = THEMES[gameState.config.e] || THEMES.physics;

    document.getElementById('victory-text').innerHTML =
        `Všechny úlohy v <strong>${escapeHtml(theme.name)}</strong> jsi vyřešil/a správně a dveře jsou otevřené!`;
    document.getElementById('victory-stats').innerHTML = `
        <p>⏱️ Čas: <strong>${min} min ${sec} s</strong></p>
        <p>✅ Vyřešeno: <strong>${gameState.config.q.length}/${gameState.config.q.length}</strong></p>
    `;
}

// ====== AI GENERATION ======
function openAiModal() {
    document.getElementById('ai-modal').classList.add('active');
    document.getElementById('ai-topic').value = '';
    document.getElementById('ai-grade').value = '';
    document.getElementById('ai-count').value = '4';
    document.getElementById('ai-error').textContent = '';
    document.getElementById('ai-loading').style.display = 'none';
    document.getElementById('ai-generate-btn').disabled = false;
    document.getElementById('ai-topic').focus();
}

function closeAiModal() {
    document.getElementById('ai-modal').classList.remove('active');
}

async function generateWithAi() {
    const topic = document.getElementById('ai-topic').value.trim();
    const grade = document.getElementById('ai-grade').value.trim();
    const count = parseInt(document.getElementById('ai-count').value);
    const errorEl = document.getElementById('ai-error');
    const loadingEl = document.getElementById('ai-loading');
    const btn = document.getElementById('ai-generate-btn');

    if (!topic) {
        errorEl.textContent = 'Zadejte téma pro generování otázek.';
        return;
    }

    if (isNaN(count) || count < 1 || count > 10) {
        errorEl.textContent = 'Počet otázek musí být mezi 1 a 10.';
        return;
    }

    errorEl.textContent = '';
    loadingEl.style.display = 'block';
    btn.disabled = true;

    try {
        const res = await fetch(AI_WORKER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic, questionCount: count, grade }),
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || 'Nepodařilo se vygenerovat otázky.');
        }

        if (!data.questions || data.questions.length === 0) {
            throw new Error('AI nevrátila žádné otázky. Zkuste jiné téma.');
        }

        editorState.questions = data.questions.map(fromConfigQuestion);

        if (!document.getElementById('room-title').value.trim()) {
            document.getElementById('room-title').value = topic;
        }

        renderQuestions();
        closeAiModal();
    } catch (err) {
        errorEl.textContent = err.message || 'Nepodařilo se spojit s AI službou. Zkuste to znovu.';
    } finally {
        loadingEl.style.display = 'none';
        btn.disabled = false;
    }
}

// ====== UTILITIES ======
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
}

function escapeAttr(str) {
    return (str || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;');
}

// ====== TASK TYPE HELPERS ======
const TASK_TYPES = {
    c: 'Výběr z možností',
    t: 'Text',
    n: 'Číslo',
    p: 'Spojování dvojic',
    s: 'Seřazení / pořadí',
    l: 'Časová osa',
    g: 'Roztřídění do skupin',
    z: 'Doplňování do textu'
};

function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function splitItems(text) {
    return String(text || '').split(',').map(s => s.trim()).filter(Boolean);
}

// Z textu se [hranatými závorkami] kolem odpovědí vytvoří {0},{1}… a seznam odpovědí.
function parseCloze(raw) {
    const a = [];
    const text = String(raw || '').replace(/\[([^\]]+)\]/g, (m, w) => {
        a.push(w.trim());
        return `{${a.length - 1}}`;
    });
    return { text: text.trim(), a };
}

// Zpětný převod cloze configu na surový text s [závorkami] pro editor.
function clozeToRaw(z) {
    if (!z) return '';
    let t = z.text || '';
    (z.a || []).forEach((w, i) => { t = t.replace(`{${i}}`, `[${w}]`); });
    return t;
}

// Převod uložené/AI otázky (kompaktní config) na položku editoru.
function fromConfigQuestion(q) {
    const item = {
        title: q.t || '',
        description: q.d || '',
        hint: q.h || '',
        image: q.im || '',
        type: q.y || 'c',
        options: q.o || ['', '', '', ''],
        correct: q.c
    };
    if (q.y === 'p') item.pairs = (q.p || []).map(p => [p.l || '', p.r || '']);
    if (q.y === 's') item.seq = (q.s || []).slice();
    if (q.y === 'l') item.tl = (q.l || []).map(t => [t.y, t.e]);
    if (q.y === 'g') item.groups = (q.g || []).map(g => ({ name: g.n || '', itemsText: (g.i || []).join(', ') }));
    if (q.y === 'z') item.clozeText = clozeToRaw(q.z);
    return item;
}

// ====== FLOATING PANEL & FEEDBACK ======
function toggleFloatingPanel() {
    document.getElementById('floating-menu').classList.toggle('open');
}

function openFeedbackModal() {
    document.getElementById('floating-menu').classList.remove('open');
    document.getElementById('feedback-modal').classList.add('active');
    document.getElementById('feedback-name').value = '';
    document.getElementById('feedback-message').value = '';
    document.getElementById('feedback-status').textContent = '';
    document.getElementById('feedback-status').className = 'feedback-status';
    document.getElementById('feedback-message').focus();
}

function closeFeedbackModal() {
    document.getElementById('feedback-modal').classList.remove('active');
}

async function submitFeedback() {
    const name = document.getElementById('feedback-name').value.trim();
    const message = document.getElementById('feedback-message').value.trim();
    const statusEl = document.getElementById('feedback-status');

    if (!message) {
        statusEl.className = 'feedback-status error';
        statusEl.textContent = 'Napište prosím zprávu.';
        return;
    }

    try {
        await db.collection('feedback').add({
            name: name || 'Anonym',
            message,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            userAgent: navigator.userAgent
        });
        statusEl.className = 'feedback-status success';
        statusEl.textContent = 'Děkujeme za zpětnou vazbu!';
        document.getElementById('feedback-message').value = '';
        setTimeout(closeFeedbackModal, 1500);
    } catch {
        const subject = encodeURIComponent('Zpětná vazba – Únikovky');
        const body = encodeURIComponent(`${name ? 'Od: ' + name + '\n\n' : ''}${message}`);
        window.open(`mailto:ondrejbek8@gmail.com?subject=${subject}&body=${body}`);
        statusEl.className = 'feedback-status success';
        statusEl.textContent = 'Otevírám e-mail...';
        setTimeout(closeFeedbackModal, 1500);
    }
}

document.addEventListener('click', (e) => {
    const panel = document.getElementById('floating-panel');
    if (panel && !panel.contains(e.target)) {
        document.getElementById('floating-menu').classList.remove('open');
    }
});

// ====== KEYBOARD ======
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeTask();
        closeDoorLock();
        closeAiModal();
        closeFeedbackModal();
    }
});

document.getElementById('lock-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') tryUnlock();
});
