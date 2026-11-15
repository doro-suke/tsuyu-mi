/**
 * レッドチーム指摘（2026-11-15）の修正確認テスト。実キーは使わない（偽キー＋ローカルのダミーHTTPサーバー）。
 * 実行: node scripts/test_redteam_fixes.js
 *
 * 確認項目:
 *  A. curl(): %VAR% 展開 / " / $(...) / バッククォート入り URL が実行・展開されない、http(s) 以外は拒否
 *  A'. 偽キーが curl のプロセス引数（プロセス一覧）に出ず、ヘッダとしては届く
 *  A''. HTTP エラー時の挙動: ok=true のまま status/httpOk を持ち、応答 JSON の error.code(429) を読める
 *  B. ダッシュボード: XSS 3例＋$& / $' の置換展開
 *  C. 件数引数の検証 / bookmarks 空のとき孤立削除しない
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

// 実キーを .env から読み込ませない（dotenv は既存の環境変数を上書きしない）
const FAKE_RAINDROP = 'FAKE_RAINDROP_KEY_abc123XYZ';
const FAKE_GEMINI = 'FAKE_GEMINI_KEY_def456UVW';
process.env.RAINDROP_API_KEY = FAKE_RAINDROP;
process.env.GEMINI_API_KEY = FAKE_GEMINI;
process.env.VESPER_FAKE_SECRET = 'SECRET_ENV_VALUE_should_never_leak';

const sync = require('./sync');
const dash = require('./generate_dashboard');

let pass = 0;
let fail = 0;
function check(name, cond, detail = '') {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
}

const SERVER_CODE = `
const http = require('http');
const log = [];
http.createServer((req, res) => {
  log.push({ url: req.url, auth: req.headers['authorization'] || null, gkey: req.headers['x-goog-api-key'] || null });
  if (req.url.startsWith('/__log')) { res.end(JSON.stringify(log)); return; }
  if (req.url.startsWith('/slow')) { setTimeout(() => res.end('slow-ok'), 3500); return; }
  if (req.url.startsWith('/gem429')) { res.statusCode = 429; res.setHeader('content-type','application/json'); res.end(JSON.stringify({ error: { code: 429, message: 'quota' } })); return; }
  if (req.url.startsWith('/missing')) { res.statusCode = 404; res.end('<html>Not Found</html>'); return; }
  let body = ''; req.on('data', d => body += d); req.on('end', () => res.end('ok:' + body.length));
}).listen(0, '127.0.0.1', function () { console.log(this.address().port); });
`;

function startServer() {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ['-e', SERVER_CODE], { stdio: ['ignore', 'pipe', 'inherit'] });
    child.stdout.once('data', (d) => resolve({ child, port: parseInt(String(d).trim(), 10) }));
  });
}

function serverLog(port) {
  const r = spawnSync(process.execPath, ['-e', `require('http').get('http://127.0.0.1:${port}/__log',r=>{let b='';r.on('data',d=>b+=d);r.on('end',()=>console.log(b))})`], { encoding: 'utf8' });
  return JSON.parse(r.stdout);
}

// curl の実行中にプロセス一覧（コマンドライン）を採取する
function startProcessPoller(ms) {
  const isWin = process.platform === 'win32';
  const script = isWin
    ? `$end=(Get-Date).AddMilliseconds(${ms}); while((Get-Date) -lt $end){ Get-CimInstance Win32_Process -Filter "Name='curl.exe'" | ForEach-Object { $_.CommandLine }; Start-Sleep -Milliseconds 100 }`
    : `end=$((SECONDS+${Math.ceil(ms / 1000)})); while [ $SECONDS -lt $end ]; do ps -eo args | grep '[c]url'; sleep 0.1; done`;
  const child = isWin
    ? spawn('powershell', ['-NoProfile', '-Command', script], { stdio: ['ignore', 'pipe', 'ignore'] })
    : spawn('sh', ['-c', script], { stdio: ['ignore', 'pipe', 'ignore'] });
  let out = '';
  child.stdout.on('data', (d) => (out += d));
  return new Promise((resolve) => child.on('close', () => resolve(out)));
}

async function main() {
  const { child: srv, port } = await startServer();
  const base = `http://127.0.0.1:${port}`;
  const markerDir = fs.mkdtempSync(path.join(sync.CONFIG.DATA_DIR, 'rt_marker_'));
  const marker = path.join(markerDir, 'PWNED');

  try {
    console.log('\n[A] curl() コマンド注入');
    const injections = [
      ['%VAR% 展開', `${base}/echo?x=%VESPER_FAKE_SECRET%`],
      ['ダブルクォート＋別コマンド', `${base}/echo?x="&echo PWNED>${marker}&"`],
      ['$(...)', `${base}/echo?x=$(echo PWNED>${marker})`],
      ['バッククォート', `${base}/echo?x=\`echo PWNED>${marker}\``],
    ];
    for (const [name, url] of injections) {
      const r = sync.curl(url);
      check(`${name}: 取得は成功（ok）`, r.ok === true);
    }
    check('どの注入でもマーカーファイルが作られない', !fs.existsSync(marker));
    const received = serverLog(port).map((e) => e.url).join('\n');
    check('%VAR% が展開されず文字列のままサーバーへ届く', received.includes('%VESPER_FAKE_SECRET%') && !received.includes('SECRET_ENV_VALUE'));

    for (const bad of ['file:///C:/Windows/win.ini', 'ftp://example.com/x', 'javascript:alert(1)', 'gopher://127.0.0.1/']) {
      const r = sync.curl(bad);
      check(`http/https 以外は拒否: ${bad.split(':')[0]}`, r.ok === false);
    }
    const crlf = sync.curl(`${base}/echo`, { headers: { 'X-Test': 'a\r\nurl = "file:///C:/Windows/win.ini"' } });
    check('ヘッダ値の改行（設定行の注入）は拒否', crlf.ok === false);

    console.log('\n[A\'] キーがプロセス一覧に出ない／ヘッダとしては届く');
    const poller = startProcessPoller(4500);
    await new Promise((r) => setTimeout(r, 600)); // poller 起動待ち
    const slow = sync.curl(`${base}/slow`, { headers: { Authorization: `Bearer ${FAKE_RAINDROP}`, 'x-goog-api-key': FAKE_GEMINI } });
    const procs = await poller;
    check('curl 実行中のプロセスを採取できた（引数は -K - のみで URL も載らない）', /curl/i.test(procs) && procs.includes('-K -') && !procs.includes('127.0.0.1'), `採取結果: ${procs.slice(0, 200)}`);
    check('プロセスのコマンドラインに Raindrop 偽キーが無い', !procs.includes(FAKE_RAINDROP));
    check('プロセスのコマンドラインに Gemini 偽キーが無い', !procs.includes(FAKE_GEMINI));
    check('応答は正常に取得', slow.ok && (await slow.text()) === 'slow-ok');
    const entry = serverLog(port).find((e) => e.url.startsWith('/slow'));
    check('Authorization ヘッダがサーバーに届く', entry && entry.auth === `Bearer ${FAKE_RAINDROP}`);
    check('x-goog-api-key ヘッダがサーバーに届く', entry && entry.gkey === FAKE_GEMINI);

    console.log('\n[A\'\'] HTTP エラー時の挙動（Gemini 429 の再試行判定が従来どおり使えるか）');
    const g = sync.curl(`${base}/gem429`, { method: 'POST', body: JSON.stringify({ a: 1 }), headers: { 'x-goog-api-key': FAKE_GEMINI } });
    const gj = await g.json();
    check('429 でも ok=true のまま（従来どおり response.ok 分岐に入らない）', g.ok === true);
    check('status=429, httpOk=false', g.status === 429 && g.httpOk === false);
    check('応答 JSON の error.code=429 を読める（既存の再試行条件に合致）', gj.error && gj.error.code === 429);
    const m = sync.curl(`${base}/missing`);
    check('404 HTML: httpOk=false', m.ok === true && m.httpOk === false && m.status === 404);
    const ex = await sync.extractContent(`${base}/missing`);
    check('extractContent は 404 の HTML を本文として扱わない（null）', ex === null);
    const post = sync.curl(`${base}/post`, { method: 'POST', body: JSON.stringify({ k: 'v' }) });
    check('POST 本文が送られ、一時ファイルを作らない', (await post.text()).startsWith('ok:') && fs.readdirSync(sync.CONFIG.DATA_DIR).every((f) => !f.startsWith('temp_post_')));

    console.log('\n[B] ダッシュボード XSS');
    let html = '';
    const origWrite = fs.writeFileSync;
    fs.writeFileSync = (p, c, ...rest) => {
      if (String(p).endsWith('index.html')) { html = String(c); return; } // 本物の index.html は上書きしない
      return origWrite(p, c, ...rest);
    };
    try {
      dash.generateDashboard({
        updated_at: new Date().toISOString(),
        articles: [
          { id: '1"onmouseover="alert(1)', url: 'javascript:alert(document.cookie)', title: '<img src=x onerror=alert(1)>', summary: '"><script>alert(2)</script>\n<b>bold</b>', excerpt: "$& and $' tail", tags: ["x');alert(3);//", '"><svg onload=alert(4)>'], score: 50, status: 'unread', analyzed_at: new Date().toISOString(), read_now_reason: '<script>alert(5)</script>' },
          { id: '2', url: 'https://example.com/ok?a=1&b=2', title: 'normal', summary: '', excerpt: "price $& $' $1 $$", tags: ['ai'], score: 10, status: 'unread', analyzed_at: new Date().toISOString() },
        ],
      });
    } finally {
      fs.writeFileSync = origWrite;
    }
    check('出力が生成された', html.length > 0);
    check('title の <img onerror> がエスケープされる', !html.includes('<img src=x onerror') && html.includes('&lt;img src=x onerror=alert(1)&gt;'));
    check('javascript: の URL は href にならない', !/href="javascript:/i.test(html));
    check('summary の <script> がエスケープされる', !html.includes('"><script>alert(2)') && !html.includes('<script>alert(2)'));
    check('read_now_reason の <script> がエスケープされる', !html.includes('<script>alert(5)'));
    check('タグ経由の onclick 注入が起きない', !html.includes("filterTag('x');alert(3)") && !html.includes('<svg onload=alert(4)>'));
    check('id 経由の属性注入が起きない', !html.includes('onmouseover="alert(1)'));
    check('正常な https URL は href に残る（& は &amp;）', html.includes('href="https://example.com/ok?a=1&amp;b=2"'));
    check("$& と $' が置換パターンとして展開されず、そのまま出力される", html.includes("price $&amp; $&#39; $1 $$") || html.includes("price $&amp; $' $1 $$") || html.includes("$&amp; and $&#39; tail"));
    check('テンプレート本体が壊れていない（</html> が1回）', (html.match(/<\/html>/g) || []).length === 1);

    console.log('\n[C] 件数引数・孤立削除ガード');
    for (const arg of ['-1', 'abc', '0', '99999', '1.5']) {
      const r = spawnSync(process.execPath, [path.join(__dirname, 'sync.js'), arg], { encoding: 'utf8', env: process.env });
      check(`引数 "${arg}" は拒否（exit 1・取得処理に入らない）`, r.status === 1 && !String(r.stdout).includes('[Raindrop]'));
    }
    const tmpNb = fs.mkdtempSync(path.join(sync.CONFIG.DATA_DIR, 'rt_nb_'));
    const orphan = path.join(tmpNb, 'keep_me.md');
    fs.writeFileSync(orphan, 'x');
    const origNb = sync.CONFIG.NOTEBOOK_DIR;
    sync.CONFIG.NOTEBOOK_DIR = tmpNb;
    try {
      sync.cleanupOrphanedMarkdowns({ articles: [] });
      check('bookmarks が空のときは .md を削除しない', fs.existsSync(orphan));
      sync.cleanupOrphanedMarkdowns({ articles: [{ markdown_path: 'data/other.md' }] });
      check('bookmarks があれば従来どおり孤立ファイルを削除する', !fs.existsSync(orphan));
    } finally {
      sync.CONFIG.NOTEBOOK_DIR = origNb;
      fs.rmSync(tmpNb, { recursive: true, force: true });
    }
  } finally {
    srv.kill();
    fs.rmSync(markerDir, { recursive: true, force: true });
  }

  console.log(`\n結果: ${pass} PASS / ${fail} FAIL`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(2); });
