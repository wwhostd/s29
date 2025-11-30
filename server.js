const express = require('express');
const cors = require('cors');
const fs = require('fs');
const app = express();

app.use(cors());
app.use(express.json());

// ملفات حفظ البيانات
const DATA_FILE = './logins.json';
const ACTIONS_FILE = './actions.json';

function loadData(file) {
    try {
        if (fs.existsSync(file)) {
            return JSON.parse(fs.readFileSync(file, 'utf8'));
        }
    } catch (e) {}
    return [];
}

function saveData(file, data) {
    try {
        fs.writeFileSync(file, JSON.stringify(data));
    } catch (e) {}
}

let logins = loadData(DATA_FILE);
let actions = loadData(ACTIONS_FILE);

// دالة تنسيق الوقت
function getFormattedTime() {
    const now = new Date();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = now.getDate();
    const month = months[now.getMonth()];
    const year = now.getFullYear();
    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    
    return {
        date: month + ' ' + day + ', ' + year,
        time: hours + ':' + minutes + ':' + seconds + ' ' + ampm
    };
}

// ==================== LOGIN ENDPOINTS ====================

app.get('/log', (req, res) => {
    const timeInfo = getFormattedTime();
    
    const login = {
        id: Date.now(),
        name: decodeURIComponent(req.query.name || 'Unknown').replace(/\+/g, ' '),
        sid: req.query.sid || '0',
        key: req.query.key || 'Unknown',
        hp: req.query.hp || '0',
        ar: req.query.ar || '0',
        st: req.query.st || '0',
        wp: req.query.wp || 'Unarmed',
        x: req.query.x || '0',
        y: req.query.y || '0',
        z: req.query.z || '0',
        h: req.query.h || '0',
        zone: decodeURIComponent(req.query.zone || 'Unknown').replace(/\+/g, ' '),
        str: decodeURIComponent(req.query.str || 'Unknown').replace(/\+/g, ' '),
        veh: decodeURIComponent(req.query.veh || 'OnFoot').replace(/\+/g, ' '),
        plt: decodeURIComponent(req.query.plt || 'NA').replace(/\+/g, ' '),
        vhp: req.query.vhp || 'NA',
        mdl: req.query.mdl || 'Unknown',
        pls: req.query.pls || '0',
        type: req.query.type || 'authorized',
        serverip: decodeURIComponent(req.query.sip || 'Unknown').replace(/\+/g, ' '),
        date: timeInfo.date,
        time: timeInfo.time
    };
    
    logins.unshift(login);
    if (logins.length > 500) logins = logins.slice(0, 500);
    saveData(DATA_FILE, logins);
    
    console.log('[LOGIN][' + login.type.toUpperCase() + '] ' + login.name + ' - Key: ' + login.key);
    res.send('OK');
});

app.get('/api/logins', (req, res) => res.json(logins));

app.delete('/api/logins/:id', (req, res) => {
    logins = logins.filter(l => l.id !== parseInt(req.params.id));
    saveData(DATA_FILE, logins);
    res.json({ success: true });
});

app.delete('/api/logins', (req, res) => {
    logins = [];
    saveData(DATA_FILE, logins);
    res.json({ success: true });
});

// ==================== ACTIONS ENDPOINTS ====================

app.get('/action', (req, res) => {
    const timeInfo = getFormattedTime();
    
    const action = {
        id: Date.now(),
        name: decodeURIComponent(req.query.name || 'Unknown').replace(/\+/g, ' '),
        sid: req.query.sid || '0',
        key: req.query.key || 'Unknown',
        tab: decodeURIComponent(req.query.tab || 'Unknown').replace(/\+/g, ' '),
        action: decodeURIComponent(req.query.action || 'Unknown').replace(/\+/g, ' '),
        details: decodeURIComponent(req.query.details || '').replace(/\+/g, ' '),
        amount: req.query.amount || '',
        item: decodeURIComponent(req.query.item || '').replace(/\+/g, ' '),
        vehicle: decodeURIComponent(req.query.vehicle || '').replace(/\+/g, ' '),
        plate: decodeURIComponent(req.query.plate || '').replace(/\+/g, ' '),
        target: req.query.target || '',
        serverip: decodeURIComponent(req.query.sip || 'Unknown').replace(/\+/g, ' '),
        x: req.query.x || '0',
        y: req.query.y || '0',
        z: req.query.z || '0',
        date: timeInfo.date,
        time: timeInfo.time
    };
    
    actions.unshift(action);
    if (actions.length > 2000) actions = actions.slice(0, 2000);
    saveData(ACTIONS_FILE, actions);
    
    console.log('[ACTION] ' + action.name + ' | ' + action.tab + ' > ' + action.action + (action.details ? ' | ' + action.details : ''));
    res.send('OK');
});

app.get('/api/actions', (req, res) => res.json(actions));

app.delete('/api/actions/:id', (req, res) => {
    actions = actions.filter(a => a.id !== parseInt(req.params.id));
    saveData(ACTIONS_FILE, actions);
    res.json({ success: true });
});

app.delete('/api/actions', (req, res) => {
    actions = [];
    saveData(ACTIONS_FILE, actions);
    res.json({ success: true });
});

// ==================== LOGIN PAGE ====================

app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>S29 Menu - Login Panel</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Inter', sans-serif;
            background: linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0f0f1a 100%);
            min-height: 100vh;
            color: #fff;
        }
        .container { max-width: 1400px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; padding: 40px 20px; }
        .logo {
            font-size: 3.5em;
            font-weight: 800;
            background: linear-gradient(135deg, #ffa500 0%, #ff6b00 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        .subtitle { color: #666; font-size: 1.1em; margin-top: 10px; letter-spacing: 2px; }
        .nav-tabs {
            display: flex; justify-content: center; gap: 15px; margin: 20px 0;
        }
        .nav-tab {
            padding: 12px 30px; border-radius: 25px; font-weight: 600;
            text-decoration: none; transition: all 0.3s;
        }
        .nav-tab.active {
            background: linear-gradient(135deg, #ffa500, #ff6b00); color: #000;
        }
        .nav-tab:not(.active) {
            background: rgba(255, 255, 255, 0.08); color: #888;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .nav-tab:not(.active):hover { background: rgba(255, 255, 255, 0.12); color: #fff; }
        .live-badge {
            display: inline-flex; align-items: center; gap: 8px;
            background: rgba(46, 213, 115, 0.15); padding: 8px 16px;
            border-radius: 20px; font-size: 0.85em; color: #2ed573; margin-top: 15px;
        }
        .live-dot {
            width: 8px; height: 8px; background: #2ed573;
            border-radius: 50%; animation: pulse 1.5s infinite;
        }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        .stats-bar { display: flex; justify-content: center; gap: 25px; margin: 30px 0; flex-wrap: wrap; }
        .stat-card {
            background: rgba(255, 165, 0, 0.08);
            border: 1px solid rgba(255, 165, 0, 0.2);
            border-radius: 12px;
            padding: 18px 35px;
            text-align: center;
        }
        .stat-number { font-size: 2.2em; font-weight: 700; color: #ffa500; }
        .stat-label { color: #666; font-size: 0.85em; margin-top: 5px; }
        .controls { display: flex; justify-content: center; gap: 12px; margin: 25px 0; flex-wrap: wrap; }
        .btn {
            padding: 12px 24px; border: none; border-radius: 8px;
            font-size: 0.9em; font-weight: 600; cursor: pointer; transition: all 0.2s;
        }
        .btn-primary { background: linear-gradient(135deg, #ffa500, #ff6b00); color: #000; }
        .btn-primary:hover { transform: scale(1.03); box-shadow: 0 5px 20px rgba(255, 165, 0, 0.3); }
        .btn-danger { background: #ff4757; color: #fff; }
        .btn-danger:hover { background: #ff3344; }
        .btn-secondary { background: rgba(255, 255, 255, 0.08); color: #fff; border: 1px solid rgba(255, 255, 255, 0.15); }
        .btn-secondary:hover { background: rgba(255, 255, 255, 0.12); }
        .search-box {
            width: 100%; max-width: 450px; padding: 12px 20px;
            border: 1px solid rgba(255, 165, 0, 0.25); border-radius: 25px;
            background: rgba(0, 0, 0, 0.3); color: #fff; font-size: 0.95em;
            margin: 0 auto 25px; display: block;
        }
        .search-box:focus { outline: none; border-color: #ffa500; }
        .logins-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(420px, 1fr)); gap: 20px; }
        .login-card {
            background: rgba(18, 18, 28, 0.95);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 16px; overflow: hidden; transition: all 0.3s;
        }
        .login-card:hover { border-color: rgba(255, 165, 0, 0.4); transform: translateY(-5px); }
        .login-card.unauthorized { border-color: rgba(255, 71, 87, 0.5); }
        .login-card.unauthorized .card-header { background: linear-gradient(135deg, rgba(255, 71, 87, 0.2), rgba(255, 71, 87, 0.1)); }
        .card-header {
            background: linear-gradient(135deg, rgba(255, 165, 0, 0.15), rgba(255, 165, 0, 0.05));
            padding: 16px 20px; display: flex; justify-content: space-between; align-items: center;
        }
        .player-info { display: flex; align-items: center; gap: 12px; }
        .player-avatar {
            width: 45px; height: 45px;
            background: linear-gradient(135deg, #ffa500, #ff6b00);
            border-radius: 50%; display: flex; align-items: center; justify-content: center;
            font-size: 1.3em; font-weight: 700; color: #000;
        }
        .login-card.unauthorized .player-avatar { background: linear-gradient(135deg, #ff4757, #ff3344); }
        .player-name { font-size: 1.15em; font-weight: 600; }
        .player-id { color: #ffa500; font-size: 0.85em; }
        .login-card.unauthorized .player-id { color: #ff4757; }
        .header-right { text-align: right; }
        .status-badge { padding: 4px 10px; border-radius: 12px; font-size: 0.7em; font-weight: 600; text-transform: uppercase; }
        .status-authorized { background: rgba(46, 213, 115, 0.2); color: #2ed573; }
        .status-unauthorized { background: rgba(255, 71, 87, 0.2); color: #ff4757; }
        .login-datetime { color: #888; font-size: 0.78em; margin-top: 6px; font-weight: 500; }
        .card-body { padding: 16px 20px; }
        .info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
        .info-item { background: rgba(0, 0, 0, 0.25); padding: 10px 12px; border-radius: 8px; }
        .info-label { color: #555; font-size: 0.72em; margin-bottom: 3px; }
        .info-value { color: #ddd; font-size: 0.88em; font-weight: 500; word-break: break-all; }
        .auth-key { grid-column: span 3; background: rgba(255, 165, 0, 0.08); border: 1px solid rgba(255, 165, 0, 0.2); }
        .auth-key .info-value { font-family: 'Courier New', monospace; font-size: 0.78em; color: #ffa500; }
        .server-ip { grid-column: span 3; background: rgba(52, 152, 219, 0.1); border: 1px solid rgba(52, 152, 219, 0.3); }
        .server-ip .info-value { color: #3498db; }
        .card-actions { padding: 12px 20px; display: flex; gap: 10px; border-top: 1px solid rgba(255, 255, 255, 0.05); }
        .action-btn { flex: 1; padding: 8px; border: none; border-radius: 6px; font-size: 0.85em; cursor: pointer; transition: all 0.2s; }
        .action-btn.copy { background: rgba(255, 165, 0, 0.15); color: #ffa500; }
        .action-btn.copy:hover { background: rgba(255, 165, 0, 0.25); }
        .action-btn.delete { background: rgba(255, 71, 87, 0.15); color: #ff4757; }
        .action-btn.delete:hover { background: rgba(255, 71, 87, 0.25); }
        .empty-state { text-align: center; padding: 60px 20px; color: #444; grid-column: span 2; }
        .empty-icon { font-size: 4em; margin-bottom: 15px; }
        .toast {
            position: fixed; bottom: 25px; right: 25px;
            background: #ffa500; color: #000; padding: 12px 22px;
            border-radius: 8px; font-weight: 600; font-size: 0.9em;
            transform: translateX(150%); transition: transform 0.3s; z-index: 1000;
        }
        .toast.show { transform: translateX(0); }
        @media (max-width: 900px) {
            .logins-grid { grid-template-columns: 1fr; }
            .info-grid { grid-template-columns: repeat(2, 1fr); }
            .auth-key, .server-ip { grid-column: span 2; }
            .logo { font-size: 2.5em; }
        }
    </style>
</head>
<body>
    <div class="container">
        <header class="header">
            <h1 class="logo">S29 MENU</h1>
            <p class="subtitle">LOGIN SECURITY PANEL</p>
            <div class="nav-tabs">
                <a href="/" class="nav-tab active">🔐 Logins</a>
                <a href="/actions" class="nav-tab">📋 Actions Log</a>
            </div>
            <div class="live-badge"><span class="live-dot"></span> LIVE MONITORING</div>
        </header>
        <div class="stats-bar">
            <div class="stat-card">
                <div class="stat-number" id="totalLogins">0</div>
                <div class="stat-label">Total Logins</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" id="authorizedLogins">0</div>
                <div class="stat-label">Authorized</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" id="unauthorizedLogins">0</div>
                <div class="stat-label">Unauthorized</div>
            </div>
        </div>
        <div class="controls">
            <button class="btn btn-primary" onclick="exportData()">📥 Export</button>
            <button class="btn btn-danger" onclick="clearAll()">🗑️ Clear All</button>
            <button class="btn btn-secondary" onclick="loadLogins()">🔄 Refresh</button>
        </div>
        <input type="text" class="search-box" id="searchBox" placeholder="🔍 Search by name, key or IP..." oninput="filterLogins()">
        <div class="logins-grid" id="loginsGrid">
            <div class="empty-state"><div class="empty-icon">🔐</div><div>Waiting for logins...</div></div>
        </div>
    </div>
    <div class="toast" id="toast"></div>
    <script>
        let logins = [];
        async function loadLogins() {
            try {
                const res = await fetch('/api/logins');
                logins = await res.json();
                renderLogins();
            } catch (e) { console.error(e); }
        }
        function renderLogins() {
            const grid = document.getElementById('loginsGrid');
            const searchTerm = document.getElementById('searchBox').value.toLowerCase();
            const filtered = logins.filter(l => 
                l.name.toLowerCase().includes(searchTerm) ||
                l.key.toLowerCase().includes(searchTerm) ||
                (l.serverip && l.serverip.toLowerCase().includes(searchTerm))
            );
            if (filtered.length === 0) {
                grid.innerHTML = '<div class="empty-state"><div class="empty-icon">🔐</div><div>No results</div></div>';
            } else {
                grid.innerHTML = filtered.map(l => \`
                    <div class="login-card \${l.type === 'unauthorized' ? 'unauthorized' : ''}">
                        <div class="card-header">
                            <div class="player-info">
                                <div class="player-avatar">\${l.name.charAt(0).toUpperCase()}</div>
                                <div>
                                    <div class="player-name">\${l.name}</div>
                                    <div class="player-id">ID: \${l.sid}</div>
                                </div>
                            </div>
                            <div class="header-right">
                                <span class="status-badge \${l.type === 'unauthorized' ? 'status-unauthorized' : 'status-authorized'}">\${l.type === 'unauthorized' ? '⚠ DENIED' : '✓ LOGGED'}</span>
                                <div class="login-datetime">\${l.date} at \${l.time}</div>
                            </div>
                        </div>
                        <div class="card-body">
                            <div class="info-grid">
                                <div class="info-item auth-key">
                                    <div class="info-label">🔑 Auth Key</div>
                                    <div class="info-value">\${l.key}</div>
                                </div>
                                <div class="info-item server-ip">
                                    <div class="info-label">🌐 Server IP</div>
                                    <div class="info-value">\${l.serverip || 'Unknown'}</div>
                                </div>
                                <div class="info-item"><div class="info-label">❤️ Health</div><div class="info-value">\${l.hp}</div></div>
                                <div class="info-item"><div class="info-label">🛡️ Armor</div><div class="info-value">\${l.ar}</div></div>
                                <div class="info-item"><div class="info-label">🏃 Stamina</div><div class="info-value">\${l.st}%</div></div>
                                <div class="info-item"><div class="info-label">🔫 Weapon</div><div class="info-value">\${l.wp}</div></div>
                                <div class="info-item"><div class="info-label">📍 Position</div><div class="info-value">\${l.x}, \${l.y}, \${l.z}</div></div>
                                <div class="info-item"><div class="info-label">🧭 Heading</div><div class="info-value">\${l.h}°</div></div>
                                <div class="info-item"><div class="info-label">🗺️ Zone</div><div class="info-value">\${l.zone}</div></div>
                                <div class="info-item"><div class="info-label">🛣️ Street</div><div class="info-value">\${l.str}</div></div>
                                <div class="info-item"><div class="info-label">🚗 Vehicle</div><div class="info-value">\${l.veh}</div></div>
                                <div class="info-item"><div class="info-label">🔢 Plate</div><div class="info-value">\${l.plt}</div></div>
                                <div class="info-item"><div class="info-label">👥 Players</div><div class="info-value">\${l.pls}</div></div>
                            </div>
                        </div>
                        <div class="card-actions">
                            <button class="action-btn copy" onclick="copyLogin(\${l.id})">📋 Copy</button>
                            <button class="action-btn delete" onclick="deleteLogin(\${l.id})">🗑️ Delete</button>
                        </div>
                    </div>
                \`).join('');
            }
            updateStats();
        }
        function updateStats() {
            document.getElementById('totalLogins').textContent = logins.length;
            document.getElementById('authorizedLogins').textContent = logins.filter(l => l.type !== 'unauthorized').length;
            document.getElementById('unauthorizedLogins').textContent = logins.filter(l => l.type === 'unauthorized').length;
        }
        function filterLogins() { renderLogins(); }
        function copyLogin(id) {
            const l = logins.find(x => x.id === id);
            if (l) {
                navigator.clipboard.writeText('Player: ' + l.name + '\\nID: ' + l.sid + '\\nKey: ' + l.key + '\\nServer IP: ' + l.serverip + '\\nPosition: ' + l.x + ', ' + l.y + ', ' + l.z + '\\nZone: ' + l.zone + '\\nDate: ' + l.date + ' ' + l.time);
                showToast('Copied!');
            }
        }
        async function deleteLogin(id) {
            await fetch('/api/logins/' + id, { method: 'DELETE' });
            loadLogins();
            showToast('Deleted!');
        }
        async function clearAll() {
            if (confirm('Delete all records?')) {
                await fetch('/api/logins', { method: 'DELETE' });
                loadLogins();
                showToast('Cleared!');
            }
        }
        function exportData() {
            const blob = new Blob([JSON.stringify(logins, null, 2)], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 's29_logins.json';
            a.click();
            showToast('Exported!');
        }
        function showToast(msg) {
            const t = document.getElementById('toast');
            t.textContent = msg;
            t.classList.add('show');
            setTimeout(() => t.classList.remove('show'), 2500);
        }
        loadLogins();
        setInterval(loadLogins, 5000);
    </script>
</body>
</html>
    `);
});

// ==================== ACTIONS PAGE ====================

app.get('/actions', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>S29 Menu - Actions Log</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Inter', sans-serif;
            background: linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0f0f1a 100%);
            min-height: 100vh;
            color: #fff;
        }
        .container { max-width: 1600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; padding: 40px 20px; }
        .logo {
            font-size: 3.5em;
            font-weight: 800;
            background: linear-gradient(135deg, #00d4ff 0%, #0099cc 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        .subtitle { color: #666; font-size: 1.1em; margin-top: 10px; letter-spacing: 2px; }
        .nav-tabs {
            display: flex; justify-content: center; gap: 15px; margin: 20px 0;
        }
        .nav-tab {
            padding: 12px 30px; border-radius: 25px; font-weight: 600;
            text-decoration: none; transition: all 0.3s;
        }
        .nav-tab.active {
            background: linear-gradient(135deg, #00d4ff, #0099cc); color: #000;
        }
        .nav-tab:not(.active) {
            background: rgba(255, 255, 255, 0.08); color: #888;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .nav-tab:not(.active):hover { background: rgba(255, 255, 255, 0.12); color: #fff; }
        .live-badge {
            display: inline-flex; align-items: center; gap: 8px;
            background: rgba(0, 212, 255, 0.15); padding: 8px 16px;
            border-radius: 20px; font-size: 0.85em; color: #00d4ff; margin-top: 15px;
        }
        .live-dot {
            width: 8px; height: 8px; background: #00d4ff;
            border-radius: 50%; animation: pulse 1.5s infinite;
        }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        .stats-bar { display: flex; justify-content: center; gap: 20px; margin: 30px 0; flex-wrap: wrap; }
        .stat-card {
            background: rgba(0, 212, 255, 0.08);
            border: 1px solid rgba(0, 212, 255, 0.2);
            border-radius: 12px;
            padding: 15px 25px;
            text-align: center;
            min-width: 120px;
        }
        .stat-number { font-size: 1.8em; font-weight: 700; color: #00d4ff; }
        .stat-label { color: #666; font-size: 0.8em; margin-top: 5px; }
        .controls { display: flex; justify-content: center; gap: 12px; margin: 25px 0; flex-wrap: wrap; }
        .btn {
            padding: 12px 24px; border: none; border-radius: 8px;
            font-size: 0.9em; font-weight: 600; cursor: pointer; transition: all 0.2s;
        }
        .btn-primary { background: linear-gradient(135deg, #00d4ff, #0099cc); color: #000; }
        .btn-primary:hover { transform: scale(1.03); box-shadow: 0 5px 20px rgba(0, 212, 255, 0.3); }
        .btn-danger { background: #ff4757; color: #fff; }
        .btn-danger:hover { background: #ff3344; }
        .btn-secondary { background: rgba(255, 255, 255, 0.08); color: #fff; border: 1px solid rgba(255, 255, 255, 0.15); }
        .btn-secondary:hover { background: rgba(255, 255, 255, 0.12); }
        .filters {
            display: flex; justify-content: center; gap: 15px; margin: 20px 0; flex-wrap: wrap; align-items: center;
        }
        .search-box {
            padding: 12px 20px;
            border: 1px solid rgba(0, 212, 255, 0.25); border-radius: 25px;
            background: rgba(0, 0, 0, 0.3); color: #fff; font-size: 0.95em;
            width: 300px;
        }
        .search-box:focus { outline: none; border-color: #00d4ff; }
        .filter-select {
            padding: 12px 20px;
            border: 1px solid rgba(0, 212, 255, 0.25); border-radius: 25px;
            background: rgba(0, 0, 0, 0.3); color: #fff; font-size: 0.95em;
            cursor: pointer;
        }
        .filter-select:focus { outline: none; border-color: #00d4ff; }
        .filter-select option { background: #1a1a2e; color: #fff; }
        .actions-table {
            width: 100%;
            background: rgba(18, 18, 28, 0.95);
            border-radius: 16px;
            overflow: hidden;
            border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .table-header {
            display: grid;
            grid-template-columns: 60px 150px 80px 120px 200px 1fr 100px 150px 80px;
            background: linear-gradient(135deg, rgba(0, 212, 255, 0.15), rgba(0, 212, 255, 0.05));
            padding: 15px 20px;
            font-weight: 600;
            font-size: 0.85em;
            color: #00d4ff;
            gap: 10px;
        }
        .table-row {
            display: grid;
            grid-template-columns: 60px 150px 80px 120px 200px 1fr 100px 150px 80px;
            padding: 12px 20px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            align-items: center;
            gap: 10px;
            transition: background 0.2s;
        }
        .table-row:hover { background: rgba(0, 212, 255, 0.05); }
        .table-row:last-child { border-bottom: none; }
        .cell { font-size: 0.88em; color: #ddd; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .cell-id { color: #888; font-family: monospace; }
        .cell-name { font-weight: 600; color: #fff; }
        .cell-tab {
            padding: 4px 10px; border-radius: 12px; font-size: 0.75em; font-weight: 600;
            text-align: center; text-transform: uppercase;
        }
        .tab-main { background: rgba(46, 213, 115, 0.2); color: #2ed573; }
        .tab-weapon { background: rgba(255, 71, 87, 0.2); color: #ff4757; }
        .tab-money { background: rgba(255, 193, 7, 0.2); color: #ffc107; }
        .tab-item { background: rgba(156, 89, 182, 0.2); color: #9b59b6; }
        .tab-vehicle { background: rgba(52, 152, 219, 0.2); color: #3498db; }
        .tab-protection { background: rgba(26, 188, 156, 0.2); color: #1abc9c; }
        .tab-crash { background: rgba(231, 76, 60, 0.2); color: #e74c3c; }
        .tab-juma { background: rgba(241, 196, 15, 0.2); color: #f1c40f; }
        .tab-trol { background: rgba(230, 126, 34, 0.2); color: #e67e22; }
        .cell-action { color: #00d4ff; font-weight: 500; }
        .cell-details { color: #aaa; font-size: 0.82em; }
        .cell-time { color: #666; font-size: 0.8em; }
        .delete-btn {
            background: rgba(255, 71, 87, 0.15); color: #ff4757;
            border: none; padding: 6px 12px; border-radius: 6px;
            cursor: pointer; font-size: 0.8em; transition: all 0.2s;
        }
        .delete-btn:hover { background: rgba(255, 71, 87, 0.3); }
        .empty-state { text-align: center; padding: 60px 20px; color: #444; }
        .empty-icon { font-size: 4em; margin-bottom: 15px; }
        .toast {
            position: fixed; bottom: 25px; right: 25px;
            background: #00d4ff; color: #000; padding: 12px 22px;
            border-radius: 8px; font-weight: 600; font-size: 0.9em;
            transform: translateX(150%); transition: transform 0.3s; z-index: 1000;
        }
        .toast.show { transform: translateX(0); }
        .pagination {
            display: flex; justify-content: center; gap: 10px; margin-top: 20px;
        }
        .page-btn {
            padding: 8px 16px; border: 1px solid rgba(0, 212, 255, 0.3);
            background: rgba(0, 0, 0, 0.3); color: #00d4ff;
            border-radius: 8px; cursor: pointer; transition: all 0.2s;
        }
        .page-btn:hover { background: rgba(0, 212, 255, 0.15); }
        .page-btn.active { background: #00d4ff; color: #000; }
        .page-info { color: #666; padding: 8px 16px; }
        @media (max-width: 1200px) {
            .table-header, .table-row {
                grid-template-columns: 60px 120px 80px 100px 150px 1fr 80px 120px 60px;
                font-size: 0.8em;
            }
        }
        @media (max-width: 900px) {
            .table-header { display: none; }
            .table-row {
                display: flex; flex-direction: column; gap: 8px;
                padding: 15px; margin: 10px 0;
                background: rgba(0, 0, 0, 0.2); border-radius: 12px;
            }
            .cell { white-space: normal; }
            .cell::before { content: attr(data-label); color: #666; font-size: 0.75em; display: block; margin-bottom: 3px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <header class="header">
            <h1 class="logo">S29 ACTIONS</h1>
            <p class="subtitle">MENU USAGE LOG</p>
            <div class="nav-tabs">
                <a href="/" class="nav-tab">🔐 Logins</a>
                <a href="/actions" class="nav-tab active">📋 Actions Log</a>
            </div>
            <div class="live-badge"><span class="live-dot"></span> REAL-TIME TRACKING</div>
        </header>
        <div class="stats-bar">
            <div class="stat-card">
                <div class="stat-number" id="totalActions">0</div>
                <div class="stat-label">Total Actions</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" id="uniqueUsers">0</div>
                <div class="stat-label">Unique Users</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" id="todayActions">0</div>
                <div class="stat-label">Today</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" id="weaponActions">0</div>
                <div class="stat-label">Weapons</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" id="moneyActions">0</div>
                <div class="stat-label">Money</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" id="itemActions">0</div>
                <div class="stat-label">Items</div>
            </div>
        </div>
        <div class="controls">
            <button class="btn btn-primary" onclick="exportActions()">📥 Export</button>
            <button class="btn btn-danger" onclick="clearAllActions()">🗑️ Clear All</button>
            <button class="btn btn-secondary" onclick="loadActions()">🔄 Refresh</button>
        </div>
        <div class="filters">
            <input type="text" class="search-box" id="searchBox" placeholder="🔍 Search by name, action or details..." oninput="filterActions()">
            <select class="filter-select" id="tabFilter" onchange="filterActions()">
                <option value="">All Tabs</option>
                <option value="Main">Main</option>
                <option value="Weapon">Weapon</option>
                <option value="Money">Money</option>
                <option value="Item">Item</option>
                <option value="Vehicle">Vehicle</option>
                <option value="Protection">Protection</option>
                <option value="Crash">Crash</option>
                <option value="juma">Juma</option>
                <option value="Trol">Trol</option>
            </select>
            <select class="filter-select" id="userFilter" onchange="filterActions()">
                <option value="">All Users</option>
            </select>
        </div>
        <div class="actions-table">
            <div class="table-header">
                <div>#</div>
                <div>Player</div>
                <div>ID</div>
                <div>Tab</div>
                <div>Action</div>
                <div>Details</div>
                <div>Amount</div>
                <div>Time</div>
                <div>Delete</div>
            </div>
            <div id="actionsBody">
                <div class="empty-state"><div class="empty-icon">📋</div><div>No actions recorded yet...</div></div>
            </div>
        </div>
        <div class="pagination" id="pagination"></div>
    </div>
    <div class="toast" id="toast"></div>
    <script>
        let actions = [];
        let currentPage = 1;
        const perPage = 50;

        async function loadActions() {
            try {
                const res = await fetch('/api/actions');
                actions = await res.json();
                updateUserFilter();
                filterActions();
            } catch (e) { console.error(e); }
        }

        function updateUserFilter() {
            const userFilter = document.getElementById('userFilter');
            const users = [...new Set(actions.map(a => a.name))];
            userFilter.innerHTML = '<option value="">All Users</option>' + 
                users.map(u => '<option value="' + u + '">' + u + '</option>').join('');
        }

        function filterActions() {
            currentPage = 1;
            renderActions();
        }

        function getTabClass(tab) {
            const classes = {
                'Main': 'tab-main',
                'Weapon': 'tab-weapon',
                'Money': 'tab-money',
                'Item': 'tab-item',
                'Vehicle': 'tab-vehicle',
                'Protection': 'tab-protection',
                'Crash': 'tab-crash',
                'juma': 'tab-juma',
                'Trol': 'tab-trol'
            };
            return classes[tab] || 'tab-main';
        }

        function renderActions() {
            const body = document.getElementById('actionsBody');
            const searchTerm = document.getElementById('searchBox').value.toLowerCase();
            const tabFilter = document.getElementById('tabFilter').value;
            const userFilter = document.getElementById('userFilter').value;

            let filtered = actions.filter(a => {
                const matchesSearch = a.name.toLowerCase().includes(searchTerm) ||
                    a.action.toLowerCase().includes(searchTerm) ||
                    (a.details && a.details.toLowerCase().includes(searchTerm));
                const matchesTab = !tabFilter || a.tab === tabFilter;
                const matchesUser = !userFilter || a.name === userFilter;
                return matchesSearch && matchesTab && matchesUser;
            });

            const totalPages = Math.ceil(filtered.length / perPage);
            const start = (currentPage - 1) * perPage;
            const paged = filtered.slice(start, start + perPage);

            if (paged.length === 0) {
                body.innerHTML = '<div class="empty-state"><div class="empty-icon">📋</div><div>No actions found</div></div>';
            } else {
                body.innerHTML = paged.map((a, i) => \`
                    <div class="table-row">
                        <div class="cell cell-id" data-label="#">\${start + i + 1}</div>
                        <div class="cell cell-name" data-label="Player">\${a.name}</div>
                        <div class="cell" data-label="ID">\${a.sid}</div>
                        <div class="cell" data-label="Tab"><span class="cell-tab \${getTabClass(a.tab)}">\${a.tab}</span></div>
                        <div class="cell cell-action" data-label="Action">\${a.action}</div>
                        <div class="cell cell-details" data-label="Details">\${a.details || '-'}</div>
                        <div class="cell" data-label="Amount">\${a.amount || '-'}</div>
                        <div class="cell cell-time" data-label="Time">\${a.date}<br>\${a.time}</div>
                        <div class="cell"><button class="delete-btn" onclick="deleteAction(\${a.id})">🗑️</button></div>
                    </div>
                \`).join('');
            }

            renderPagination(filtered.length, totalPages);
            updateStats(filtered);
        }

        function renderPagination(total, totalPages) {
            const pagination = document.getElementById('pagination');
            if (totalPages <= 1) {
                pagination.innerHTML = '';
                return;
            }

            let html = '';
            if (currentPage > 1) {
                html += '<button class="page-btn" onclick="goToPage(' + (currentPage - 1) + ')">◀ Prev</button>';
            }
            
            html += '<span class="page-info">Page ' + currentPage + ' of ' + totalPages + ' (' + total + ' total)</span>';
            
            if (currentPage < totalPages) {
                html += '<button class="page-btn" onclick="goToPage(' + (currentPage + 1) + ')">Next ▶</button>';
            }
            
            pagination.innerHTML = html;
        }

        function goToPage(page) {
            currentPage = page;
            renderActions();
            window.scrollTo({ top: 400, behavior: 'smooth' });
        }

        function updateStats(filtered) {
            const today = new Date().toDateString();
            const todayStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            
            document.getElementById('totalActions').textContent = actions.length;
            document.getElementById('uniqueUsers').textContent = new Set(actions.map(a => a.name)).size;
            document.getElementById('todayActions').textContent = actions.filter(a => a.date && a.date.includes(todayStr.split(',')[0])).length;
            document.getElementById('weaponActions').textContent = actions.filter(a => a.tab === 'Weapon').length;
            document.getElementById('moneyActions').textContent = actions.filter(a => a.tab === 'Money').length;
            document.getElementById('itemActions').textContent = actions.filter(a => a.tab === 'Item').length;
        }

        async function deleteAction(id) {
            await fetch('/api/actions/' + id, { method: 'DELETE' });
            loadActions();
            showToast('Deleted!');
        }

        async function clearAllActions() {
            if (confirm('Delete ALL action records? This cannot be undone!')) {
                await fetch('/api/actions', { method: 'DELETE' });
                loadActions();
                showToast('All actions cleared!');
            }
        }

        function exportActions() {
            const blob = new Blob([JSON.stringify(actions, null, 2)], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 's29_actions_log.json';
            a.click();
            showToast('Exported!');
        }

        function showToast(msg) {
            const t = document.getElementById('toast');
            t.textContent = msg;
            t.classList.add('show');
            setTimeout(() => t.classList.remove('show'), 2500);
        }

        loadActions();
        setInterval(loadActions, 5000);
    </script>
</body>
</html>
    `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('S29 Server running on port ' + PORT));
