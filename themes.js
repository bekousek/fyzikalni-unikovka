const THEMES = {
    physics: {
        id: 'physics',
        name: 'Fyzikální laboratoř',
        icon: '🔬',
        headerIcon: '🔬',
        wallColor: '#E8DCC8',
        floorColor: '#8B7355',
        trimColor: '#6B5335',
        objects: [
            { label: 'Tabule', icon: '📝' },
            { label: 'Váhy', icon: '⚖️' },
            { label: 'Police', icon: '📚' },
            { label: 'Kyvadlo', icon: '⏱️' },
            { label: 'Stůl', icon: '🔬' },
        ]
    },
    chemistry: {
        id: 'chemistry',
        name: 'Chemická laboratoř',
        icon: '🧪',
        headerIcon: '🧪',
        wallColor: '#D4E8E0',
        floorColor: '#B0B0B0',
        trimColor: '#555',
        objects: [
            { label: 'Digestoř', icon: '🌬️' },
            { label: 'Per. tabulka', icon: '🧬' },
            { label: 'Zkumavky', icon: '🧪' },
            { label: 'Kahan', icon: '🔥' },
            { label: 'Police', icon: '🧴' },
        ]
    },
    history: {
        id: 'history',
        name: 'Historická studovna',
        icon: '📜',
        headerIcon: '📜',
        wallColor: '#C8B090',
        floorColor: '#6B4226',
        trimColor: '#4A2E1A',
        objects: [
            { label: 'Mapa', icon: '🗺️' },
            { label: 'Globus', icon: '🌍' },
            { label: 'Spisy', icon: '📜' },
            { label: 'Hodiny', icon: '🕰️' },
            { label: 'Truhla', icon: '📦' },
        ]
    },
    math: {
        id: 'math',
        name: 'Matematická učebna',
        icon: '📐',
        headerIcon: '📐',
        wallColor: '#E0E8F0',
        floorColor: '#A0A8B0',
        trimColor: '#6080A0',
        objects: [
            { label: 'Tabule', icon: '📊' },
            { label: 'Kalkulačka', icon: '🔢' },
            { label: 'Kružítko', icon: '📐' },
            { label: 'Graf', icon: '📈' },
            { label: 'Počítadlo', icon: '🧮' },
        ]
    },
    biology: {
        id: 'biology',
        name: 'Přírodovědná stanice',
        icon: '🌿',
        headerIcon: '🌿',
        wallColor: '#D8E8C8',
        floorColor: '#8B7355',
        trimColor: '#5A6B3A',
        objects: [
            { label: 'Mikroskop', icon: '🔬' },
            { label: 'Herbář', icon: '🌿' },
            { label: 'Akvárium', icon: '🐠' },
            { label: 'Sbírka', icon: '🦋' },
            { label: 'Rostlina', icon: '🪴' },
        ]
    },
    geography: {
        id: 'geography',
        name: 'Zeměpisná učebna',
        icon: '🗺️',
        headerIcon: '🗺️',
        wallColor: '#D0D8E8',
        floorColor: '#A09080',
        trimColor: '#5A6A80',
        objects: [
            { label: 'Globus', icon: '🌍' },
            { label: 'Mapa', icon: '🗺️' },
            { label: 'Atlas', icon: '📖' },
            { label: 'Kompas', icon: '🧭' },
            { label: 'Barometr', icon: '🌡️' },
        ]
    }
};

function generateRoomSVG(themeId, taskCount) {
    const theme = THEMES[themeId] || THEMES.physics;
    const n = Math.min(taskCount, 5);

    const objectPositions = [
        { x: 80, y: 50, w: 300, h: 200, lx: 230, ly: 195, type: 'wall' },
        { x: 50, y: 390, w: 280, h: 110, lx: 190, ly: 455, type: 'table' },
        { x: 820, y: 50, w: 170, h: 230, lx: 905, ly: 265, type: 'wall' },
        { x: 430, y: 260, w: 100, h: 140, lx: 480, ly: 390, type: 'wall' },
        { x: 600, y: 370, w: 300, h: 130, lx: 750, ly: 445, type: 'table' },
    ];

    let objectsSVG = '';
    for (let i = 0; i < n; i++) {
        const pos = objectPositions[i];
        const obj = theme.objects[i];
        objectsSVG += generateObject(themeId, i, pos, obj);
    }

    return `
    <svg viewBox="0 0 1200 700" xmlns="http://www.w3.org/2000/svg">
        <!-- Floor -->
        ${generateFloor(theme)}
        <!-- Wall -->
        <rect x="0" y="0" width="1200" height="500" fill="${theme.wallColor}"/>
        <!-- Trim -->
        <rect x="0" y="0" width="1200" height="8" fill="${theme.trimColor}"/>
        <rect x="0" y="0" width="8" height="500" fill="${theme.trimColor}"/>
        <rect x="1192" y="0" width="8" height="500" fill="${theme.trimColor}"/>
        <rect x="0" y="492" width="1200" height="8" fill="${theme.trimColor}"/>
        <!-- Window -->
        ${generateWindow(themeId)}
        <!-- Door -->
        ${generateDoor()}
        <!-- Objects -->
        ${objectsSVG}
        <!-- Table shadows -->
        <ellipse cx="190" cy="555" rx="130" ry="7" fill="rgba(0,0,0,0.12)"/>
        <ellipse cx="750" cy="555" rx="140" ry="7" fill="rgba(0,0,0,0.12)"/>
    </svg>`;
}

function generateFloor(theme) {
    const c1 = theme.floorColor;
    const c2 = adjustColor(c1, 10);
    let tiles = '';
    for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 8; col++) {
            const even = (row + col) % 2 === 0;
            tiles += `<rect x="${col * 150}" y="${500 + row * 100}" width="150" height="100" fill="${even ? c1 : c2}" stroke="${adjustColor(c1, -10)}" stroke-width="1"/>`;
        }
    }
    return tiles;
}

function adjustColor(hex, amount) {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, Math.max(0, (num >> 16) + amount));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0xFF) + amount));
    const b = Math.min(255, Math.max(0, (num & 0xFF) + amount));
    return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
}

function generateWindow(themeId) {
    const skyColors = {
        physics: '#87CEEB',
        chemistry: '#87CEEB',
        history: '#8899AA',
        math: '#87CEEB',
        biology: '#90D890',
        geography: '#6CB4EE'
    };
    const sky = skyColors[themeId] || '#87CEEB';
    return `
        <rect x="480" y="40" width="240" height="180" rx="4" fill="${sky}" stroke="#6B5335" stroke-width="6"/>
        <line x1="600" y1="40" x2="600" y2="220" stroke="#6B5335" stroke-width="3"/>
        <line x1="480" y1="130" x2="720" y2="130" stroke="#6B5335" stroke-width="3"/>
        <ellipse cx="530" cy="78" rx="28" ry="14" fill="white" opacity="0.6"/>
        <ellipse cx="660" cy="95" rx="22" ry="10" fill="white" opacity="0.4"/>
    `;
}

function generateDoor() {
    return `
        <g id="door-group">
            <rect x="1020" y="200" width="140" height="300" rx="4" fill="#6B4226" stroke="#4A2E1A" stroke-width="3"/>
            <rect x="1035" y="215" width="110" height="120" rx="3" fill="#7A5230" stroke="#4A2E1A" stroke-width="1.5"/>
            <rect x="1035" y="350" width="110" height="120" rx="3" fill="#7A5230" stroke="#4A2E1A" stroke-width="1.5"/>
            <circle cx="1050" cy="370" r="7" fill="#D4AF37" stroke="#B8960C" stroke-width="2"/>
            <rect x="1040" y="348" width="18" height="13" rx="3" fill="#888" stroke="#666" stroke-width="1"/>
            <text x="1090" y="195" fill="#4A2E1A" font-size="11" text-anchor="middle" font-weight="bold">VÝCHOD</text>
        </g>
    `;
}

function generateObject(themeId, index, pos, obj) {
    const generators = {
        physics: [genPhysicsBlackboard, genPhysicsScales, genPhysicsShelf, genPhysicsPendulum, genPhysicsLabTable],
        chemistry: [genChemHood, genChemPeriodicTable, genChemTestTubes, genChemBunsen, genChemShelf],
        history: [genHistoryMap, genHistoryGlobe, genHistoryScrolls, genHistoryClock, genHistoryChest],
        math: [genMathBoard, genMathCalc, genMathCompass, genMathGraph, genMathAbacus],
        biology: [genBioMicroscope, genBioHerbarium, genBioAquarium, genBioCollection, genBioPlant],
        geography: [genGeoGlobe, genGeoMap, genGeoAtlas, genGeoCompass, genGeoBarometer],
    };
    const gen = generators[themeId]?.[index];
    if (!gen) return generateGenericObject(index, pos, obj);
    return `<g class="clickable-object" data-task="${index}" role="button" tabindex="0">
        ${gen(pos)}
        <text x="${pos.lx}" y="${pos.ly}" fill="#FFD700" font-size="11" text-anchor="middle">${obj.icon} Klikni!</text>
        <circle class="task-indicator" data-task-ind="${index}" cx="${pos.x + pos.w - 15}" cy="${pos.y + 15}" r="10" fill="#666" opacity="0.4"/>
    </g>`;
}

function generateGenericObject(index, pos, obj) {
    return `<g class="clickable-object" data-task="${index}" role="button" tabindex="0">
        <rect x="${pos.x}" y="${pos.y}" width="${pos.w}" height="${pos.h}" rx="8" fill="rgba(255,255,255,0.08)" stroke="#666" stroke-width="2"/>
        <text x="${pos.x + pos.w/2}" y="${pos.y + pos.h/2 - 10}" fill="white" font-size="36" text-anchor="middle">${obj.icon}</text>
        <text x="${pos.x + pos.w/2}" y="${pos.y + pos.h/2 + 20}" fill="#ccc" font-size="13" text-anchor="middle">${obj.label}</text>
        <text x="${pos.lx}" y="${pos.ly}" fill="#FFD700" font-size="11" text-anchor="middle">Klikni!</text>
        <circle class="task-indicator" data-task-ind="${index}" cx="${pos.x + pos.w - 15}" cy="${pos.y + 15}" r="10" fill="#666" opacity="0.4"/>
    </g>`;
}

// ====== PHYSICS ======
function genPhysicsBlackboard(p) {
    return `
        <rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" rx="4" fill="#2D5A27" stroke="#6B5335" stroke-width="7"/>
        <rect x="${p.x}" y="${p.y + p.h}" width="${p.w}" height="14" fill="#6B5335"/>
        <text x="${p.x + p.w/2}" y="${p.y + 70}" fill="#E8E8E8" font-size="18" text-anchor="middle" font-family="'Courier New',monospace">F = m · a</text>
        <text x="${p.x + p.w/2}" y="${p.y + 105}" fill="#E8E8E8" font-size="14" text-anchor="middle" font-family="'Courier New',monospace">v = s / t</text>
        <rect x="${p.x + 20}" y="${p.y + p.h + 3}" width="28" height="7" rx="2" fill="white"/>
        <rect x="${p.x + 55}" y="${p.y + p.h + 3}" width="22" height="7" rx="2" fill="#FFEB3B"/>
    `;
}
function genPhysicsScales(p) {
    return `
        <rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h - 30}" rx="3" fill="#8B6914" stroke="#6B4E0A" stroke-width="3"/>
        <rect x="${p.x + 20}" y="${p.y + p.h - 30}" width="18" height="55" fill="#6B4E0A"/>
        <rect x="${p.x + p.w - 38}" y="${p.y + p.h - 30}" width="18" height="55" fill="#6B4E0A"/>
        <rect x="${p.x + p.w/2 - 5}" y="${p.y - 35}" width="10" height="35" fill="#888"/>
        <polygon points="${p.x + p.w/2},${p.y - 40} ${p.x + p.w/2 - 18},${p.y - 28} ${p.x + p.w/2 + 18},${p.y - 28}" fill="#AAA"/>
        <line x1="${p.x + p.w/2 - 50}" y1="${p.y - 25}" x2="${p.x + p.w/2}" y2="${p.y - 38}" stroke="#888" stroke-width="2"/>
        <line x1="${p.x + p.w/2 + 50}" y1="${p.y - 20}" x2="${p.x + p.w/2}" y2="${p.y - 38}" stroke="#888" stroke-width="2"/>
        <ellipse cx="${p.x + p.w/2 - 50}" cy="${p.y - 22}" rx="22" ry="7" fill="#B8860B"/>
        <ellipse cx="${p.x + p.w/2 + 50}" cy="${p.y - 17}" rx="22" ry="7" fill="#B8860B"/>
        <rect x="${p.x + p.w/2 - 58}" y="${p.y - 33}" width="16" height="10" rx="2" fill="#555"/>
    `;
}
function genPhysicsShelf(p) {
    return `
        <rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" fill="#6B4E0A" stroke="#4A3508" stroke-width="3"/>
        <rect x="${p.x + 5}" y="${p.y + 55}" width="${p.w - 10}" height="4" fill="#4A3508"/>
        <rect x="${p.x + 5}" y="${p.y + 115}" width="${p.w - 10}" height="4" fill="#4A3508"/>
        <rect x="${p.x + 5}" y="${p.y + 175}" width="${p.w - 10}" height="4" fill="#4A3508"/>
        ${generateBooks(p.x + 8, p.y + 8, p.w - 16, 45)}
        ${generateBooks(p.x + 8, p.y + 62, p.w - 16, 50)}
        ${generateBooks(p.x + 8, p.y + 122, p.w - 16, 50)}
    `;
}
function genPhysicsPendulum(p) {
    return `
        <rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" rx="4" fill="#6B4226" stroke="#4A2E1A" stroke-width="3"/>
        <circle cx="${p.x + p.w/2}" cy="${p.y + 40}" r="26" fill="#FFF8E1" stroke="#4A2E1A" stroke-width="2"/>
        <text x="${p.x + p.w/2}" y="${p.y + 30}" fill="#333" font-size="7" text-anchor="middle">12</text>
        <text x="${p.x + p.w/2 + 20}" y="${p.y + 44}" fill="#333" font-size="7" text-anchor="middle">3</text>
        <text x="${p.x + p.w/2}" y="${p.y + 56}" fill="#333" font-size="7" text-anchor="middle">6</text>
        <text x="${p.x + p.w/2 - 20}" y="${p.y + 44}" fill="#333" font-size="7" text-anchor="middle">9</text>
        <line x1="${p.x + p.w/2}" y1="${p.y + 40}" x2="${p.x + p.w/2}" y2="${p.y + 24}" stroke="#333" stroke-width="2"/>
        <line x1="${p.x + p.w/2}" y1="${p.y + 40}" x2="${p.x + p.w/2 + 14}" y2="${p.y + 40}" stroke="#333" stroke-width="1.5"/>
        <line x1="${p.x + p.w/2}" y1="${p.y + 66}" x2="${p.x + p.w/2 - 12}" y2="${p.y + 110}" stroke="#B8960C" stroke-width="2">
            <animate attributeName="x2" values="${p.x + p.w/2 - 12};${p.x + p.w/2 + 12};${p.x + p.w/2 - 12}" dur="2s" repeatCount="indefinite"/>
        </line>
        <circle cx="${p.x + p.w/2 - 12}" cy="${p.y + 110}" r="7" fill="#D4AF37" stroke="#B8960C" stroke-width="2">
            <animate attributeName="cx" values="${p.x + p.w/2 - 12};${p.x + p.w/2 + 12};${p.x + p.w/2 - 12}" dur="2s" repeatCount="indefinite"/>
        </circle>
    `;
}
function genPhysicsLabTable(p) {
    return `
        <rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h - 30}" rx="3" fill="#8B6914" stroke="#6B4E0A" stroke-width="3"/>
        <rect x="${p.x + 20}" y="${p.y + p.h - 30}" width="18" height="55" fill="#6B4E0A"/>
        <rect x="${p.x + p.w - 38}" y="${p.y + p.h - 30}" width="18" height="55" fill="#6B4E0A"/>
        <polygon points="${p.x + 40},${p.y - 5} ${p.x + 160},${p.y - 5} ${p.x + 40},${p.y - 55}" fill="#999" stroke="#666" stroke-width="2"/>
        <circle cx="${p.x + 75}" cy="${p.y - 25}" r="9" fill="#E53935" stroke="#C62828" stroke-width="2"/>
        <rect x="${p.x + 200}" y="${p.y - 12}" width="70" height="10" rx="2" fill="#FFE082" stroke="#F9A825" stroke-width="1"/>
    `;
}

// ====== CHEMISTRY ======
function genChemHood(p) {
    return `
        <rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" rx="4" fill="#D0D0D0" stroke="#999" stroke-width="3"/>
        <rect x="${p.x + 10}" y="${p.y + 10}" width="${p.w - 20}" height="${p.h - 40}" rx="3" fill="#8FBCBB" opacity="0.3" stroke="#6B8A89" stroke-width="1"/>
        <rect x="${p.x + 30}" y="${p.y + p.h - 50}" width="20" height="35" rx="3" fill="#4FC3F7"/>
        <rect x="${p.x + 70}" y="${p.y + p.h - 60}" width="18" height="45" rx="3" fill="#81C784"/>
        <rect x="${p.x + 110}" y="${p.y + p.h - 45}" width="22" height="30" rx="3" fill="#FFB74D"/>
        <rect x="${p.x}" y="${p.y + p.h - 5}" width="${p.w}" height="10" fill="#999"/>
    `;
}
function genChemPeriodicTable(p) {
    return `
        <rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h - 30}" rx="3" fill="#8B6914" stroke="#6B4E0A" stroke-width="3"/>
        <rect x="${p.x + 20}" y="${p.y + p.h - 30}" width="18" height="55" fill="#6B4E0A"/>
        <rect x="${p.x + p.w - 38}" y="${p.y + p.h - 30}" width="18" height="55" fill="#6B4E0A"/>
        <rect x="${p.x + 15}" y="${p.y + 8}" width="${p.w - 30}" height="${p.h - 55}" rx="2" fill="white" stroke="#333" stroke-width="1"/>
        ${generateMiniPeriodicTable(p.x + 20, p.y + 13, p.w - 40, p.h - 65)}
    `;
}
function genChemTestTubes(p) {
    return `
        <rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" fill="#6B4E0A" stroke="#4A3508" stroke-width="3"/>
        <rect x="${p.x + 5}" y="${p.y + 55}" width="${p.w - 10}" height="4" fill="#4A3508"/>
        <rect x="${p.x + 5}" y="${p.y + 115}" width="${p.w - 10}" height="4" fill="#4A3508"/>
        <rect x="${p.x + 5}" y="${p.y + 175}" width="${p.w - 10}" height="4" fill="#4A3508"/>
        ${generateTestTubeRow(p.x + 20, p.y + 10, 5, 40)}
        ${generateTestTubeRow(p.x + 20, p.y + 65, 5, 45)}
        ${generateTestTubeRow(p.x + 20, p.y + 125, 4, 45)}
    `;
}
function genChemBunsen(p) {
    return `
        <rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" rx="4" fill="#888" stroke="#666" stroke-width="2"/>
        <rect x="${p.x + p.w/2 - 8}" y="${p.y + 20}" width="16" height="80" fill="#666" stroke="#555" stroke-width="1"/>
        <rect x="${p.x + p.w/2 - 18}" y="${p.y + 95}" width="36" height="15" rx="3" fill="#777"/>
        <polygon points="${p.x + p.w/2},${p.y + 5} ${p.x + p.w/2 - 6},${p.y + 20} ${p.x + p.w/2 + 6},${p.y + 20}" fill="#FF6F00" opacity="0.9">
            <animate attributeName="opacity" values="0.9;0.5;0.9" dur="0.8s" repeatCount="indefinite"/>
        </polygon>
        <polygon points="${p.x + p.w/2},${p.y}" ${p.x + p.w/2 - 3},${p.y + 12} ${p.x + p.w/2 + 3},${p.y + 12}" fill="#FFEB3B" opacity="0.7">
            <animate attributeName="opacity" values="0.7;0.3;0.7" dur="0.6s" repeatCount="indefinite"/>
        </polygon>
    `;
}
function genChemShelf(p) {
    return `
        <rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h - 30}" rx="3" fill="#D0D0D0" stroke="#999" stroke-width="3"/>
        <rect x="${p.x + 20}" y="${p.y + p.h - 30}" width="18" height="55" fill="#999"/>
        <rect x="${p.x + p.w - 38}" y="${p.y + p.h - 30}" width="18" height="55" fill="#999"/>
        <rect x="${p.x + 20}" y="${p.y + 10}" width="30" height="40" rx="4" fill="#4FC3F7"/>
        <rect x="${p.x + 60}" y="${p.y + 15}" width="25" height="35" rx="4" fill="#81C784"/>
        <rect x="${p.x + 95}" y="${p.y + 8}" width="28" height="42" rx="4" fill="#FF8A65"/>
        <rect x="${p.x + 140}" y="${p.y + 12}" width="22" height="38" rx="4" fill="#CE93D8"/>
        <rect x="${p.x + 180}" y="${p.y + 10}" width="26" height="40" rx="4" fill="#FFF176"/>
    `;
}

// ====== HISTORY ======
function genHistoryMap(p) {
    return `
        <rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" rx="3" fill="#F5E6C8" stroke="#8B7355" stroke-width="4"/>
        <rect x="${p.x + 15}" y="${p.y + 15}" width="${p.w - 30}" height="${p.h - 30}" fill="#E8D8B8" stroke="#B0A080" stroke-width="1"/>
        <path d="${randomContinent(p.x + 40, p.y + 40, p.w - 80, p.h - 80)}" fill="#8B9A6B" stroke="#6B7A4B" stroke-width="1"/>
        <text x="${p.x + p.w/2}" y="${p.y + p.h - 8}" fill="#8B7355" font-size="10" text-anchor="middle">MAPA SVĚTA</text>
    `;
}
function genHistoryGlobe(p) {
    return `
        <rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h - 30}" rx="3" fill="#8B6914" stroke="#6B4E0A" stroke-width="3"/>
        <rect x="${p.x + 20}" y="${p.y + p.h - 30}" width="18" height="55" fill="#6B4E0A"/>
        <rect x="${p.x + p.w - 38}" y="${p.y + p.h - 30}" width="18" height="55" fill="#6B4E0A"/>
        <circle cx="${p.x + p.w/2}" cy="${p.y - 25}" r="35" fill="#4FC3F7" stroke="#333" stroke-width="2"/>
        <ellipse cx="${p.x + p.w/2 - 5}" cy="${p.y - 30}" rx="15" ry="20" fill="#8BC34A" opacity="0.7"/>
        <ellipse cx="${p.x + p.w/2 + 12}" cy="${p.y - 15}" rx="10" ry="12" fill="#8BC34A" opacity="0.6"/>
        <ellipse cx="${p.x + p.w/2}" cy="${p.y - 25}" rx="34" ry="34" fill="none" stroke="#333" stroke-width="0.5"/>
        <line x1="${p.x + p.w/2 - 35}" y1="${p.y - 25}" x2="${p.x + p.w/2 + 35}" y2="${p.y - 25}" stroke="#333" stroke-width="0.5"/>
        <rect x="${p.x + p.w/2 - 3}" y="${p.y + 10}" width="6" height="20" fill="#333"/>
        <rect x="${p.x + p.w/2 - 15}" y="${p.y + 28}" width="30" height="5" rx="2" fill="#333"/>
    `;
}
function genHistoryScrolls(p) {
    return `
        <rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" fill="#6B4E0A" stroke="#4A3508" stroke-width="3"/>
        <rect x="${p.x + 5}" y="${p.y + 55}" width="${p.w - 10}" height="4" fill="#4A3508"/>
        <rect x="${p.x + 5}" y="${p.y + 115}" width="${p.w - 10}" height="4" fill="#4A3508"/>
        <rect x="${p.x + 5}" y="${p.y + 175}" width="${p.w - 10}" height="4" fill="#4A3508"/>
        ${generateScrolls(p.x + 10, p.y + 10, p.w - 20, 40)}
        ${generateBooks(p.x + 10, p.y + 62, p.w - 20, 50)}
        ${generateScrolls(p.x + 10, p.y + 125, p.w - 20, 45)}
    `;
}
function genHistoryClock(p) {
    return `
        <rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" rx="8" fill="#6B4226" stroke="#4A2E1A" stroke-width="3"/>
        <circle cx="${p.x + p.w/2}" cy="${p.y + 50}" r="35" fill="#FFF8E1" stroke="#4A2E1A" stroke-width="3"/>
        <text x="${p.x + p.w/2}" y="${p.y + 25}" fill="#333" font-size="10" text-anchor="middle">XII</text>
        <text x="${p.x + p.w/2 + 28}" y="${p.y + 54}" fill="#333" font-size="9" text-anchor="middle">III</text>
        <text x="${p.x + p.w/2}" y="${p.y + 80}" fill="#333" font-size="10" text-anchor="middle">VI</text>
        <text x="${p.x + p.w/2 - 28}" y="${p.y + 54}" fill="#333" font-size="9" text-anchor="middle">IX</text>
        <line x1="${p.x + p.w/2}" y1="${p.y + 50}" x2="${p.x + p.w/2}" y2="${p.y + 28}" stroke="#333" stroke-width="2.5"/>
        <line x1="${p.x + p.w/2}" y1="${p.y + 50}" x2="${p.x + p.w/2 + 18}" y2="${p.y + 44}" stroke="#333" stroke-width="2"/>
        <circle cx="${p.x + p.w/2}" cy="${p.y + 50}" r="3" fill="#8B4513"/>
    `;
}
function genHistoryChest(p) {
    return `
        <rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h - 30}" rx="3" fill="#8B6914" stroke="#6B4E0A" stroke-width="3"/>
        <rect x="${p.x + 20}" y="${p.y + p.h - 30}" width="18" height="55" fill="#6B4E0A"/>
        <rect x="${p.x + p.w - 38}" y="${p.y + p.h - 30}" width="18" height="55" fill="#6B4E0A"/>
        <rect x="${p.x + 40}" y="${p.y - 50}" width="${p.w - 80}" height="50" rx="4" fill="#8B5E3C" stroke="#5C3D2E" stroke-width="2"/>
        <path d="M${p.x + 40},${p.y - 50} Q${p.x + p.w/2},${p.y - 75} ${p.x + p.w - 40},${p.y - 50}" fill="#9B6E4C" stroke="#5C3D2E" stroke-width="2"/>
        <rect x="${p.x + p.w/2 - 8}" y="${p.y - 35}" width="16" height="12" rx="2" fill="#D4AF37" stroke="#B8960C" stroke-width="1"/>
        <circle cx="${p.x + p.w/2}" cy="${p.y - 26}" r="4" fill="#B8960C"/>
    `;
}

// ====== MATH ======
function genMathBoard(p) {
    return `
        <rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" rx="3" fill="white" stroke="#6080A0" stroke-width="6"/>
        <text x="${p.x + 30}" y="${p.y + 50}" fill="#333" font-size="16" font-family="'Courier New',monospace">x² + 2x - 3 = 0</text>
        <text x="${p.x + 30}" y="${p.y + 85}" fill="#1565C0" font-size="14" font-family="'Courier New',monospace">D = b² - 4ac</text>
        <text x="${p.x + 30}" y="${p.y + 120}" fill="#E53935" font-size="13" font-family="'Courier New',monospace">x₁ = ? x₂ = ?</text>
        <rect x="${p.x + p.w - 40}" y="${p.y + p.h - 15}" width="35" height="12" rx="2" fill="#333"/>
    `;
}
function genMathCalc(p) {
    return `
        <rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h - 30}" rx="3" fill="#8B6914" stroke="#6B4E0A" stroke-width="3"/>
        <rect x="${p.x + 20}" y="${p.y + p.h - 30}" width="18" height="55" fill="#6B4E0A"/>
        <rect x="${p.x + p.w - 38}" y="${p.y + p.h - 30}" width="18" height="55" fill="#6B4E0A"/>
        <rect x="${p.x + p.w/2 - 30}" y="${p.y - 60}" width="60" height="55" rx="4" fill="#333" stroke="#222" stroke-width="2"/>
        <rect x="${p.x + p.w/2 - 24}" y="${p.y - 55}" width="48" height="16" rx="2" fill="#8BC34A"/>
        <text x="${p.x + p.w/2}" y="${p.y - 42}" fill="#333" font-size="12" text-anchor="middle" font-family="monospace">3.14</text>
        ${generateCalcButtons(p.x + p.w/2 - 22, p.y - 33, 44, 22)}
    `;
}
function genMathCompass(p) {
    return `
        <rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" fill="#6B4E0A" stroke="#4A3508" stroke-width="3"/>
        <rect x="${p.x + 5}" y="${p.y + 55}" width="${p.w - 10}" height="4" fill="#4A3508"/>
        <rect x="${p.x + 5}" y="${p.y + 115}" width="${p.w - 10}" height="4" fill="#4A3508"/>
        <rect x="${p.x + 5}" y="${p.y + 175}" width="${p.w - 10}" height="4" fill="#4A3508"/>
        <circle cx="${p.x + p.w/2}" cy="${p.y + 30}" r="20" fill="none" stroke="#E53935" stroke-width="2" stroke-dasharray="4"/>
        <polygon points="${p.x + p.w/2},${p.y + 8} ${p.x + p.w/2 - 3},${p.y + 30} ${p.x + p.w/2 + 3},${p.y + 30}" fill="#888"/>
        <line x1="${p.x + p.w/2}" y1="${p.y + 30}" x2="${p.x + p.w/2 + 18}" y2="${p.y + 48}" stroke="#888" stroke-width="2"/>
        ${generateBooks(p.x + 10, p.y + 62, p.w - 20, 50)}
        ${generateBooks(p.x + 10, p.y + 122, p.w - 20, 48)}
    `;
}
function genMathGraph(p) {
    return `
        <rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" rx="5" fill="white" stroke="#6080A0" stroke-width="3"/>
        <line x1="${p.x + 15}" y1="${p.y + p.h/2}" x2="${p.x + p.w - 15}" y2="${p.y + p.h/2}" stroke="#ccc" stroke-width="1"/>
        <line x1="${p.x + p.w/2}" y1="${p.y + 10}" x2="${p.x + p.w/2}" y2="${p.y + p.h - 10}" stroke="#ccc" stroke-width="1"/>
        <path d="M${p.x + 15},${p.y + p.h - 20} Q${p.x + p.w/2},${p.y + 10} ${p.x + p.w - 15},${p.y + p.h - 20}" fill="none" stroke="#E53935" stroke-width="2"/>
        <text x="${p.x + p.w - 20}" y="${p.y + p.h/2 - 5}" fill="#666" font-size="10">x</text>
        <text x="${p.x + p.w/2 + 5}" y="${p.y + 18}" fill="#666" font-size="10">y</text>
    `;
}
function genMathAbacus(p) {
    return `
        <rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h - 30}" rx="3" fill="#8B6914" stroke="#6B4E0A" stroke-width="3"/>
        <rect x="${p.x + 20}" y="${p.y + p.h - 30}" width="18" height="55" fill="#6B4E0A"/>
        <rect x="${p.x + p.w - 38}" y="${p.y + p.h - 30}" width="18" height="55" fill="#6B4E0A"/>
        <rect x="${p.x + 60}" y="${p.y - 55}" width="${p.w - 120}" height="50" rx="4" fill="#8B5E3C" stroke="#5C3D2E" stroke-width="2"/>
        ${generateAbacusRows(p.x + 65, p.y - 50, p.w - 130, 40)}
    `;
}

// ====== BIOLOGY ======
function genBioMicroscope(p) {
    return `
        <rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" rx="4" fill="#2D5A27" stroke="#1A3A17" stroke-width="5"/>
        <rect x="${p.x + 20}" y="${p.y + p.h - 5}" width="${p.w - 40}" height="10" fill="#1A3A17"/>
        <text x="${p.x + p.w/2}" y="${p.y + 60}" fill="#E8E8E8" font-size="40" text-anchor="middle">🔬</text>
        <text x="${p.x + p.w/2}" y="${p.y + 100}" fill="#C8E6C9" font-size="13" text-anchor="middle" font-family="'Courier New',monospace">Buňka</text>
        <text x="${p.x + p.w/2}" y="${p.y + 130}" fill="#A5D6A7" font-size="11" text-anchor="middle">jádro · cytoplazma</text>
    `;
}
function genBioHerbarium(p) {
    return `
        <rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h - 30}" rx="3" fill="#8B6914" stroke="#6B4E0A" stroke-width="3"/>
        <rect x="${p.x + 20}" y="${p.y + p.h - 30}" width="18" height="55" fill="#6B4E0A"/>
        <rect x="${p.x + p.w - 38}" y="${p.y + p.h - 30}" width="18" height="55" fill="#6B4E0A"/>
        <rect x="${p.x + 30}" y="${p.y - 50}" width="${p.w - 60}" height="45" rx="3" fill="#F5E6C8" stroke="#8B7355" stroke-width="2"/>
        <text x="${p.x + p.w/2}" y="${p.y - 30}" fill="#5A6B3A" font-size="28" text-anchor="middle">🌿🍃🍂</text>
        <text x="${p.x + p.w/2}" y="${p.y - 10}" fill="#8B7355" font-size="9" text-anchor="middle">HERBÁŘ</text>
    `;
}
function genBioAquarium(p) {
    return `
        <rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" fill="#6B4E0A" stroke="#4A3508" stroke-width="3"/>
        <rect x="${p.x + 10}" y="${p.y + 10}" width="${p.w - 20}" height="${p.h/2}" rx="3" fill="#1E88E5" opacity="0.4" stroke="#0D47A1" stroke-width="2"/>
        <text x="${p.x + 40}" y="${p.y + 35}" fill="white" font-size="18">🐠</text>
        <text x="${p.x + 80}" y="${p.y + 50}" fill="white" font-size="14">🐟</text>
        <text x="${p.x + 120}" y="${p.y + 40}" fill="white" font-size="10">🦐</text>
        <rect x="${p.x + 5}" y="${p.y + p.h/2 + 15}" width="${p.w - 10}" height="4" fill="#4A3508"/>
        ${generateBooks(p.x + 10, p.y + p.h/2 + 25, p.w - 20, p.h/2 - 35)}
    `;
}
function genBioCollection(p) {
    return `
        <rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" rx="5" fill="#F5E6C8" stroke="#8B7355" stroke-width="3"/>
        <text x="${p.x + 15}" y="${p.y + 35}" font-size="22">🦋</text>
        <text x="${p.x + 48}" y="${p.y + 40}" font-size="18">🪲</text>
        <text x="${p.x + 15}" y="${p.y + 75}" font-size="20">🐛</text>
        <text x="${p.x + 50}" y="${p.y + 70}" font-size="16">🐝</text>
        <text x="${p.x + p.w/2}" y="${p.y + p.h - 10}" fill="#8B7355" font-size="9" text-anchor="middle">ENTOMOLOGICKÁ SBÍRKA</text>
    `;
}
function genBioPlant(p) {
    return `
        <rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h - 30}" rx="3" fill="#8B6914" stroke="#6B4E0A" stroke-width="3"/>
        <rect x="${p.x + 20}" y="${p.y + p.h - 30}" width="18" height="55" fill="#6B4E0A"/>
        <rect x="${p.x + p.w - 38}" y="${p.y + p.h - 30}" width="18" height="55" fill="#6B4E0A"/>
        <rect x="${p.x + p.w/2 - 18}" y="${p.y - 10}" width="36" height="30" rx="3" fill="#8D6E63"/>
        <text x="${p.x + p.w/2}" y="${p.y - 20}" font-size="35" text-anchor="middle">🪴</text>
        <rect x="${p.x + 30}" y="${p.y + 10}" width="50" height="35" rx="4" fill="#E8F5E9" stroke="#A5D6A7" stroke-width="1"/>
        <text x="${p.x + 55}" y="${p.y + 33}" fill="#2E7D32" font-size="10" text-anchor="middle">DNA</text>
    `;
}

// ====== GEOGRAPHY ======
function genGeoGlobe(p) {
    return `
        <rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" rx="4" fill="#D0D8E8" stroke="#5A6A80" stroke-width="5"/>
        <circle cx="${p.x + p.w/2}" cy="${p.y + p.h/2 - 10}" r="60" fill="#4FC3F7" stroke="#0288D1" stroke-width="2"/>
        <ellipse cx="${p.x + p.w/2 - 15}" cy="${p.y + p.h/2 - 20}" rx="25" ry="30" fill="#8BC34A" opacity="0.7"/>
        <ellipse cx="${p.x + p.w/2 + 20}" cy="${p.y + p.h/2}" rx="15" ry="18" fill="#8BC34A" opacity="0.6"/>
        <ellipse cx="${p.x + p.w/2}" cy="${p.y + p.h/2 - 10}" rx="59" ry="59" fill="none" stroke="#0288D1" stroke-width="0.5"/>
        <line x1="${p.x + p.w/2 - 60}" y1="${p.y + p.h/2 - 10}" x2="${p.x + p.w/2 + 60}" y2="${p.y + p.h/2 - 10}" stroke="#0288D1" stroke-width="0.5"/>
    `;
}
function genGeoMap(p) {
    return `
        <rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h - 30}" rx="3" fill="#8B6914" stroke="#6B4E0A" stroke-width="3"/>
        <rect x="${p.x + 20}" y="${p.y + p.h - 30}" width="18" height="55" fill="#6B4E0A"/>
        <rect x="${p.x + p.w - 38}" y="${p.y + p.h - 30}" width="18" height="55" fill="#6B4E0A"/>
        <rect x="${p.x + 10}" y="${p.y - 60}" width="${p.w - 20}" height="55" rx="3" fill="#F5E6C8" stroke="#8B7355" stroke-width="2"/>
        <path d="M${p.x + 30},${p.y - 40} l20,-5 l15,10 l25,-8 l20,12 l-10,15 l-25,5 l-20,-8 l-15,3 z" fill="#8BC34A" stroke="#5A6B3A" stroke-width="1"/>
        <circle cx="${p.x + 70}" cy="${p.y - 35}" r="3" fill="#E53935"/>
        <text x="${p.x + p.w/2}" y="${p.y - 8}" fill="#8B7355" font-size="9" text-anchor="middle">NÁSTĚNNÁ MAPA</text>
    `;
}
function genGeoAtlas(p) {
    return `
        <rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" fill="#6B4E0A" stroke="#4A3508" stroke-width="3"/>
        <rect x="${p.x + 5}" y="${p.y + 55}" width="${p.w - 10}" height="4" fill="#4A3508"/>
        <rect x="${p.x + 5}" y="${p.y + 115}" width="${p.w - 10}" height="4" fill="#4A3508"/>
        <rect x="${p.x + 5}" y="${p.y + 175}" width="${p.w - 10}" height="4" fill="#4A3508"/>
        ${generateBooks(p.x + 10, p.y + 8, p.w - 20, 44)}
        ${generateBooks(p.x + 10, p.y + 62, p.w - 20, 50)}
        ${generateBooks(p.x + 10, p.y + 122, p.w - 20, 48)}
    `;
}
function genGeoCompass(p) {
    return `
        <rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" rx="10" fill="#6B4226" stroke="#4A2E1A" stroke-width="3"/>
        <circle cx="${p.x + p.w/2}" cy="${p.y + p.h/2}" r="40" fill="#FFF8E1" stroke="#4A2E1A" stroke-width="3"/>
        <circle cx="${p.x + p.w/2}" cy="${p.y + p.h/2}" r="35" fill="#FFF8E1" stroke="#888" stroke-width="1"/>
        <text x="${p.x + p.w/2}" y="${p.y + p.h/2 - 25}" fill="#E53935" font-size="14" font-weight="bold" text-anchor="middle">S</text>
        <text x="${p.x + p.w/2}" y="${p.y + p.h/2 + 33}" fill="#333" font-size="12" text-anchor="middle">J</text>
        <text x="${p.x + p.w/2 + 28}" y="${p.y + p.h/2 + 5}" fill="#333" font-size="12" text-anchor="middle">V</text>
        <text x="${p.x + p.w/2 - 28}" y="${p.y + p.h/2 + 5}" fill="#333" font-size="12" text-anchor="middle">Z</text>
        <polygon points="${p.x + p.w/2},${p.y + p.h/2 - 20} ${p.x + p.w/2 - 5},${p.y + p.h/2} ${p.x + p.w/2 + 5},${p.y + p.h/2}" fill="#E53935"/>
        <polygon points="${p.x + p.w/2},${p.y + p.h/2 + 20} ${p.x + p.w/2 - 5},${p.y + p.h/2} ${p.x + p.w/2 + 5},${p.y + p.h/2}" fill="#333"/>
    `;
}
function genGeoBarometer(p) {
    return `
        <rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h - 30}" rx="3" fill="#8B6914" stroke="#6B4E0A" stroke-width="3"/>
        <rect x="${p.x + 20}" y="${p.y + p.h - 30}" width="18" height="55" fill="#6B4E0A"/>
        <rect x="${p.x + p.w - 38}" y="${p.y + p.h - 30}" width="18" height="55" fill="#6B4E0A"/>
        <rect x="${p.x + p.w/2 - 20}" y="${p.y - 65}" width="40" height="60" rx="4" fill="#6B4226" stroke="#4A2E1A" stroke-width="2"/>
        <rect x="${p.x + p.w/2 - 5}" y="${p.y - 58}" width="10" height="40" rx="5" fill="#ddd" stroke="#999" stroke-width="1"/>
        <rect x="${p.x + p.w/2 - 4}" y="${p.y - 35}" width="8" height="17" rx="4" fill="#E53935"/>
        <circle cx="${p.x + p.w/2}" cy="${p.y - 15}" r="7" fill="#E53935" stroke="#999" stroke-width="1"/>
        <text x="${p.x + p.w/2}" y="${p.y - 8}" fill="#4A2E1A" font-size="7" text-anchor="middle">°C</text>
    `;
}

// ====== HELPERS ======
function generateBooks(x, y, width, height) {
    const colors = ['#C62828', '#1565C0', '#2E7D32', '#E65100', '#6A1B9A', '#00838F', '#AD1457', '#FF8F00', '#283593', '#1B5E20', '#B71C1C', '#4A148C'];
    let svg = '';
    let cx = x;
    while (cx < x + width - 8) {
        const bw = 12 + Math.floor(Math.random() * 12);
        const bh = height - Math.floor(Math.random() * 12);
        const color = colors[Math.floor(Math.random() * colors.length)];
        if (cx + bw > x + width) break;
        svg += `<rect x="${cx}" y="${y + (height - bh)}" width="${bw}" height="${bh}" fill="${color}" rx="1"/>`;
        cx += bw + 2;
    }
    return svg;
}

function generateScrolls(x, y, width, height) {
    let svg = '';
    for (let i = 0; i < 4; i++) {
        const sx = x + i * (width / 4) + 5;
        const sw = width / 5;
        svg += `<rect x="${sx}" y="${y + 5}" width="${sw}" height="${height - 10}" rx="4" fill="#F5E6C8" stroke="#C8B090" stroke-width="1"/>`;
        svg += `<circle cx="${sx + sw/2}" cy="${y + 5}" r="4" fill="#C8B090"/>`;
        svg += `<circle cx="${sx + sw/2}" cy="${y + height - 5}" r="4" fill="#C8B090"/>`;
    }
    return svg;
}

function generateTestTubeRow(x, y, count, height) {
    const colors = ['#4FC3F7', '#81C784', '#FFB74D', '#CE93D8', '#FF8A65', '#80DEEA'];
    let svg = '';
    for (let i = 0; i < count; i++) {
        const tx = x + i * 28;
        const fill = height - 15 - Math.floor(Math.random() * 15);
        svg += `<rect x="${tx}" y="${y}" width="10" height="${height}" rx="5" fill="#ddd" stroke="#bbb" stroke-width="1"/>`;
        svg += `<rect x="${tx + 1}" y="${y + height - fill}" width="8" height="${fill - 3}" rx="4" fill="${colors[i % colors.length]}" opacity="0.7"/>`;
    }
    return svg;
}

function generateMiniPeriodicTable(x, y, w, h) {
    const colors = ['#E3F2FD', '#E8F5E9', '#FFF3E0', '#FCE4EC', '#F3E5F5', '#E0F7FA'];
    let svg = '';
    const cols = 9;
    const rows = 4;
    const cw = (w - 5) / cols;
    const ch = (h - 5) / rows;
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (r === 0 && c > 0 && c < cols - 1 && Math.random() > 0.4) continue;
            svg += `<rect x="${x + c * cw + 1}" y="${y + r * ch + 1}" width="${cw - 2}" height="${ch - 2}" rx="1" fill="${colors[(r + c) % colors.length]}" stroke="#ccc" stroke-width="0.5"/>`;
        }
    }
    return svg;
}

function generateCalcButtons(x, y, w, h) {
    let svg = '';
    const bw = w / 4;
    const bh = h / 2;
    for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 4; c++) {
            svg += `<rect x="${x + c * bw + 1}" y="${y + r * bh + 1}" width="${bw - 2}" height="${bh - 2}" rx="1" fill="#555" stroke="#444" stroke-width="0.5"/>`;
        }
    }
    return svg;
}

function generateAbacusRows(x, y, w, h) {
    const colors = ['#E53935', '#1E88E5', '#43A047', '#FB8C00', '#8E24AA'];
    let svg = '';
    for (let i = 0; i < 4; i++) {
        const ry = y + 5 + i * (h / 4);
        svg += `<line x1="${x}" y1="${ry}" x2="${x + w}" y2="${ry}" stroke="#8B5E3C" stroke-width="2"/>`;
        for (let b = 0; b < 5; b++) {
            svg += `<circle cx="${x + 10 + b * 16}" cy="${ry}" r="5" fill="${colors[(i + b) % 5]}"/>`;
        }
    }
    return svg;
}

function randomContinent(x, y, w, h) {
    return `M${x + w * 0.1},${y + h * 0.3} l${w * 0.15},-${h * 0.15} l${w * 0.2},${h * 0.05} l${w * 0.1},-${h * 0.1} l${w * 0.15},${h * 0.2} l-${w * 0.1},${h * 0.25} l-${w * 0.2},${h * 0.05} l-${w * 0.15},-${h * 0.1} z`;
}
