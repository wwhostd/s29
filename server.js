const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

let logins = [];

// استقبال الدخول الجديد
app.get('/log', (req, res) => {
    const now = new Date();
    const login = {
        id: Date.now(),
        name: decodeURIComponent(req.query.name || 'Unknown'),
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
        zone: decodeURIComponent(req.query.zone || 'Unknown'),
        str: decodeURIComponent(req.query.str || 'Unknown'),
        veh: decodeURIComponent(req.query.veh || 'OnFoot'),
        plt: decodeURIComponent(req.query.plt || 'NA'),
        vhp: req.query.vhp || 'NA',
        mdl: req.query.mdl || 'Unknown',
        pls: req.query.pls || '0',
        type: req.query.type || 'authorized',
        date: now.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }),
        time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
    };
    
    logins.unshift(login);
    if (logins.length > 500) logins = logins.slice(0, 500);
    
    console.log(`[${login.type.toUpperCase()}] ${login.name} - Key: ${login.key}`);
    res.send('OK');
});

app.get('/api/logins', (req, res) => res.json(logins));
app.delete('/api/logins/:id', (req, res) => {
    logins = logins.filter(l => l.id !== parseInt(req.params.id));
    res.json({ success: true });
});
app.delete('/api/logins', (req, res) => {
    logins = [];
    res.json({ success: true });
});

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
        .live-badge {
            display: inline-flex; align-items: center; gap: 8px;
            background: rgba(46, 213, 115, 0.15); padding: 8px 16px;
            border-radius: 20px; font-size: 0.85em; color: #2ed573; margin-top: 15px;
        }
        .live-dot {
            width: 8px; height: 8px; background: #2ed573;
            border-radius: 50%; animation: pulse 1.5s infinite;
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
        }
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
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            font-size: 0.9em;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
        }
        .btn-primary { background: linear-gradient(135deg, #ffa500, #ff6b00); color: #000; }
        .btn-primary:hover { transform: scale(1.03); box-shadow: 0 5px 20px rgba(255, 165, 0, 0.3); }
        .btn-danger { background: #ff4757; color: #fff; }
        .btn-danger:hover { background: #ff3344; }
        .btn-secondary { background: rgba(255, 255, 255, 0.08); color: #fff; border: 1px solid rgba(255, 255, 255, 0.15); }
        .btn-secondary:hover { background: rgba(255, 255, 255, 0.12); }
        .search-box {
            width: 100%; max-width: 450px;
            padding: 12px 20px;
            border: 1px solid rgba(255, 165, 0, 0.25);
            border-radius: 25px;
            background: rgba(0, 0, 0, 0.3);
            color: #fff;
            font-size: 0.95em;
            margin: 0 auto 25px;
            display: block;
        }
        .search-box:focus { outline: none; border-color: #ffa500; }
        .logins-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 20px; }
        .login-card {
            background: rgba(18, 18, 28, 0.95);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 16px;
            overflow: hidden;
            transition: all 0.3s;
        }
        .login-card:hover { border-color: rgba(255, 165, 0, 0.4); transform: translateY(-5px); }
        .login-card.unauthorized { border-color: rgba(255, 71, 87, 0.5); }
        .login-card.unauthorized .card-header { background: linear-gradient(135deg, rgba(255, 71, 87, 0.2), rgba(255, 71, 87, 0.1)); }
        .card-header {
            background: linear-gradient(135deg, rgba(255, 165, 0, 0.15), rgba(255, 165, 0, 0.05));
            padding: 16px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .player-info { display: flex; align-items: center; gap: 12px; }
        .player-avatar {
            width: 45px; height: 45px;
            background: linear-gradient(135deg, #ffa500, #ff6b00);
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            font-size: 1.3em; font-weight: 700; color: #000;
        }
        .login-card.unauthorized .player-avatar { background: linear-gradient(135deg, #ff4757, #ff3344); }
        .player-name { font-size: 1.15em; font-weight: 600; }
        .player-id { color: #ffa500; font-size: 0.85em; }
        .login-card.unauthorized .player-id { color: #ff4757; }
        .header-right { text-align: right; }
        .status-badge {
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 0.7em;
            font-weight: 600;
            text-transform: uppercase;
        }
        .status-authorized { background: rgba(46, 213, 115, 0.2); color: #2ed573; }
        .status-unauthorized { background: rgba(255, 71, 87, 0.2); color: #ff4757; }
        .login-datetime { color: #555; font-size: 0.8em; margin-top: 6px; }
        .card-body { padding: 16px 20px; }
        .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
        .info-item {
            background: rgba(0, 0, 0, 0.25);
            padding: 10px 12px;
            border-radius: 8px;
        }
        .info-label { color: #555; font-size: 0.75em; margin-bottom: 3px; }
        .info-value { color: #ddd; font-size: 0.9em; font-weight: 500; word-break: break-all; }
        .auth-key {
            grid-column: span 2;
            background: rgba(255, 165, 0, 0.08);
            border: 1px solid rgba(255, 165, 0, 0.2);
        }
        .auth-key .info-value { font-family: 'Courier New', monospace; font-size: 0.8em; color: #ffa500; }
        .card-actions { padding: 12px 20px; display: flex; gap: 10px; border-top: 1px solid rgba(255, 255, 255, 0.05); }
        .action-btn {
            flex: 1; padding: 8px; border: none; border-radius: 6px;
            font-size: 0.85em; cursor: pointer; transition: all 0.2s;
        }
        .action-btn.copy { background: rgba(255, 165, 0, 0.15); color: #ffa500; }
        .action-btn.copy:hover { background: rgba(255, 165, 0, 0.25); }
        .action-btn.delete { background: rgba(255, 71, 87, 0.15); color: #ff4757; }
        .action-btn.delete:hover { background: rgba(255, 71, 87, 0.25); }
        .empty-state { text-align: center; padding: 60px 20px; color: #444; }
        .empty-icon { font-size: 4em; margin-bottom: 15px; }
        .toast {
            position: fixed; bottom: 25px; right: 25px;
            background: #ffa500; color: #000; padding: 12px 22px;
            border-radius: 8px; font-weight: 600; font-size: 0.9em;
            transform: translateX(150%); transition: transform 0.3s; z-index: 1000;
        }
        .toast.show { transform: translateX(0); }
        @media (max-width: 768px) {
            .logins-grid { grid-template-columns: 1fr; }
            .logo { font-size: 2.5em; }
            .info-grid { grid-template-columns: 1fr; }
            .auth-key { grid-column: span 1; }
        }
    </style>
</head>
<body>
    <div class="container">
        <header class="header">
            <h1 class="logo">S29 MENU</h1>
            <p class="subtitle">LOGIN SECURITY PANEL</p>
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
            <button class="btn btn-primary" onclick="exportData()">Export Data</button>
            <button class="btn btn-danger" onclick="clearAll()">Clear All</button>
            <button class="btn btn-secondary" onclick="loadLogins()">Refresh</button>
        </div>
        <input type="text" class="search-box" id="searchBox" placeholder="Search by name or key..." oninput="filterLogins()">
        <div class="logins-grid" id="loginsGrid">
            <div class="empty-state" id="emptyState">
                <div class="empty-icon">🔐</div>
                <div>Waiting for logins...</div>
            </div>
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
                l.key.toLowerCase().includes(searchTerm)
            );
            if (filtered.length === 0) {
                grid.innerHTML = '<div class="empty-state"><div class="empty-icon">🔐</div><div>No results found</div></div>';
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
                                <div class="login-datetime">\${l.date} • \${l.time}</div>
                            </div>
                        </div>
                        <div class="card-body">
                            <div class="info-grid">
                                <div class="info-item auth-key">
                                    <div class="info-label">🔑 Auth Key</div>
                                    <div class="info-value">\${l.key}</div>
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
                navigator.clipboard.writeText(\`Player: \${l.name}\\nID: \${l.sid}\\nKey: \${l.key}\\nPosition: \${l.x}, \${l.y}, \${l.z}\\nZone: \${l.zone}\\nDate: \${l.date} \${l.time}\`);
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
                showToast('All cleared!');
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
    </script>
</body>
</html>
    `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('S29 Server running on port ' + PORT));
