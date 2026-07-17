const fs = require('fs');
const path = require('path');

const CONFIG = {
  DATA_DIR: path.join(__dirname, '..', 'data'),
  BOOKMARKS_JSON: path.join(__dirname, '..', 'data', 'bookmarks.json'),
  TEMPLATE_FILE: path.join(__dirname, '..', 'templates', 'dashboard_template.html'),
  INDEX_HTML: path.join(__dirname, '..', 'index.html'),
};

function deriveScore(article) {
  if (article.score !== undefined) return article.score;
  const map = { high: 75, medium: 45, low: 15 };
  return map[(article.priority || 'low').toLowerCase()] ?? 15;
}

function assignTiers(articles) {
  const sorted = [...articles].sort((a, b) => deriveScore(b) - deriveScore(a));
  const n = sorted.length;
  const highCut = Math.ceil(n * 0.15);
  const medCut = Math.ceil(n * 0.50);
  sorted.forEach((article, i) => {
    article._tier = i < highCut ? 'high' : i < medCut ? 'medium' : 'low';
  });
}

const TAG_MAP = {
  'prompt engineering': 'プロンプトエンジニアリング',
  'promptengineering': 'プロンプトエンジニアリング',
  'aiプロンプト': 'プロンプトエンジニアリング',
  'claudecode': 'ClaudeCode',
  'claude code': 'ClaudeCode',
  'llm': '生成AI',
  'ai自動化': 'AI自動化',
  'ai駆動開発': 'AI駆動開発',
  'ai開発': 'AI駆動開発'
};

function normalizeTags(tags = []) {
  const normalized = tags.map(tag => {
    const lowTag = tag.toLowerCase().trim().replace(/^#/, '');
    return TAG_MAP[lowTag] || tag.trim().replace(/^#/, '');
  });
  return [...new Set(normalized)];
}

function generateDashboard(data) {
  if (!fs.existsSync(CONFIG.TEMPLATE_FILE)) {
    console.error(`テンプレートファイルが見つかりません: ${CONFIG.TEMPLATE_FILE}`);
    return;
  }
  const template = fs.readFileSync(CONFIG.TEMPLATE_FILE, 'utf8');
  
  const getPriorityClasses = (p) => {
    switch (p.toLowerCase()) {
      case 'high': return { border: 'border-red-900/80', badge: 'bg-red-950/40 text-red-300 border border-red-900/50', label: 'High' };
      case 'medium': return { border: 'border-amber-900/80', badge: 'bg-amber-950/40 text-amber-300 border border-amber-900/50', label: 'Medium' };
      case 'low': return { border: 'border-[#2a2a30]', badge: 'bg-[#1a1a1f] text-[#8e8e93] border border-[#2c2c34]', label: 'Low' };
      default: return { border: 'border-[#2c2c34]', badge: 'bg-slate-900/60 text-slate-400 border border-slate-800', label: p };
    }
  };

  const generateCard = (article) => {
    const classes = getPriorityClasses(article._tier);
    const tags = normalizeTags(article.tags);
    const tagsHtml = tags.map(tag => `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-[#1a1a1f] text-[#c8968c] border border-[#2c2c34]/50 mr-1 mb-1">#${tag}</span>`).join('');
    const mdRelPath = article.markdown_path ? `./${article.markdown_path}` : '#';
    const isRead = article.status === 'read';
    const score = deriveScore(article);
    return `
      <div class="article-card flex flex-col bg-[#18181b] rounded-lg shadow-xl overflow-hidden border-t-2 ${classes.border} border-x border-b border-[#222228] transition transform hover:-translate-y-1 hover:shadow-2xl hover:border-[#c8968c]/70 ${isRead ? 'status-read' : ''}"
           data-article-id="${article.id}"
           data-title="${article.title.replace(/"/g, '&quot;')}"
           data-summary="${article.summary.replace(/"/g, '&quot;')}"
           data-priority="${article._tier}"
           data-score="${score}"
           data-tags="${tags.join(',')}">
          <div class="px-6 py-5 flex-grow">
              <div class="flex justify-between items-start mb-3">
                  <span class="px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase ${classes.badge}">${classes.label} <span class="opacity-70">· ${score}</span></span>
                  <div class="flex items-center gap-2">
                    <button onclick="toggleStatus('${article.id}')" class="toggle-status-btn text-xs font-medium text-[#c8968c] hover:text-[#e8c3b9] underline transition-colors">
                        ${isRead ? '未読に戻す' : '既読にする'}
                    </button>
                    <button onclick="deleteArticle('${article.id}')" class="text-xs font-medium text-red-400 hover:text-red-300 underline ml-1 transition-colors">
                        削除
                    </button>
                    <span class="text-xs text-gray-500">${new Date(article.analyzed_at).toLocaleDateString('ja-JP')}</span>
                  </div>
              </div>
              <h2 class="text-lg font-bold mb-3 line-clamp-2 text-[#f4f4f5] hover:text-[#e8c3b9] transition-colors leading-snug">
                  <a href="${article.url}" target="_blank">${article.title}</a>
              </h2>
              <div class="text-[#a1a1aa] text-sm mb-4 space-y-1">
                  ${article.summary.split('\n').map(line => `<p class="leading-relaxed">・ ${line}</p>`).join('')}
              </div>
              <div class="bg-[#131316] p-3 rounded-md mb-4 border border-[#222228]/80">
                  <p class="text-[9px] font-bold text-[#c8968c] uppercase tracking-wider mb-1">今読む理由</p>
                  <p class="text-xs text-[#e4e4e7] italic leading-relaxed">${article.read_now_reason}</p>
              </div>
              <div class="mt-auto">${tagsHtml}</div>
          </div>
          <div class="px-6 py-4 bg-[#141417] border-t border-[#222228] grid grid-cols-2 gap-2">
              <a href="${article.url}" target="_blank" class="inline-flex justify-center items-center px-4 py-2 text-sm font-semibold rounded-md text-[#121214] bg-gradient-to-r from-[#c8968c] to-[#e8c3b9] hover:opacity-90 transition-opacity">記事を読む</a>
              <a href="${mdRelPath}" target="_blank" class="inline-flex justify-center items-center px-4 py-2 border border-[#2c2c34] text-sm font-semibold rounded-md text-[#e8c3b9] bg-[#1a1a1f] hover:bg-[#222228] transition-colors">AI用ソース</a>
          </div>
      </div>`;
  };
  assignTiers(data.articles);
  const sortedArticles = [...data.articles].sort((a, b) => new Date(b.analyzed_at) - new Date(a.analyzed_at));
  const articlesHtml = sortedArticles.map(generateCard).join('\n');
  const finalHtml = template
    .replace('{{last_updated}}', new Date(data.updated_at).toLocaleString('ja-JP'))
    .replace('<!-- ARTICLES_PLACEHOLDER -->', articlesHtml);
  fs.writeFileSync(CONFIG.INDEX_HTML, finalHtml, 'utf8');
  console.log(`[Dashboard] ダッシュボードを更新しました: ${CONFIG.INDEX_HTML}`);
}

function generateNotebookMaster(bookmarks) {
  const masterPath = path.join(CONFIG.DATA_DIR, 'notebooklm_master.md');
  console.log(`[NotebookLM] 一括パッキングファイル生成中: ${masterPath}`);

  assignTiers(bookmarks.articles);
  
  const highUnreadArticles = bookmarks.articles
    .filter(a => a.status === 'unread' && a._tier === 'high')
    .sort((a, b) => deriveScore(b) - deriveScore(a))
    .slice(0, 50);

  if (highUnreadArticles.length === 0) {
    fs.writeFileSync(masterPath, `# Vesper - NotebookLM Master Source\n\n現在、High優先度の未読記事はありません。\n`, 'utf8');
    console.log(`[NotebookLM] 対象記事が0件のため、空のマスターファイルを書き出しました。`);
    return;
  }

  let content = `# Vesper - NotebookLM Master Source\n`;
  content += `最終更新日: ${new Date().toLocaleString('ja-JP')}\n`;
  content += `対象記事数: ${highUnreadArticles.length} 件 (未読かつHigh優先度)\n\n`;
  content += `---\n\n`;

  highUnreadArticles.forEach((article, index) => {
    content += `## ${index + 1}. [${article.title}](${article.url})\n`;
    content += `- **優先度**: High\n`;
    content += `- **スコア**: ${deriveScore(article)}\n`;
    content += `- **解析日時**: ${new Date(article.analyzed_at).toLocaleDateString('ja-JP')}\n`;
    content += `- **AI要約**:\n${article.summary.split('\n').map(s => `  ${s}`).join('\n')}\n`;
    content += `- **今読む理由**: ${article.read_now_reason}\n`;
    content += `- **タグ**: ${article.tags.map(t => `#${t}`).join(', ')}\n\n`;

    const localMdPath = article.markdown_path ? path.resolve(path.join(__dirname, '..', article.markdown_path)) : null;
    if (localMdPath && fs.existsSync(localMdPath)) {
      try {
        const localContent = fs.readFileSync(localMdPath, 'utf8');
        const bodyMatch = localContent.split('## 本文');
        if (bodyMatch[1]) {
          content += `### 本文\n${bodyMatch[1].trim()}\n\n`;
        } else {
          content += `### 本文\n${localContent}\n\n`;
        }
      } catch (err) {
        content += `### 本文\n(ローカル本文の読み込みに失敗しました: ${err.message})\n\n`;
      }
    } else {
      content += `### 本文\n(ローカルの本文ソースがありません。)\n\n`;
    }
    content += `---\n\n`;
  });

  fs.writeFileSync(masterPath, content, 'utf8');
  console.log(`[NotebookLM] 一括パッキング完了: 合計 ${highUnreadArticles.length} 件の記事を統合しました。`);
}

function main() {
  if (!fs.existsSync(CONFIG.BOOKMARKS_JSON)) {
    console.error(`エラー: ブックマークデータが見つかりません: ${CONFIG.BOOKMARKS_JSON}`);
    process.exit(1);
  }

  const bookmarks = JSON.parse(fs.readFileSync(CONFIG.BOOKMARKS_JSON, 'utf8'));
  
  // ダッシュボードとNotebookLMマスターの生成
  generateDashboard(bookmarks);
  generateNotebookMaster(bookmarks);
  
  console.log(`[Dashboard] 更新処理がすべて完了しました。`);
}

if (require.main === module) {
  main();
}

module.exports = {
  generateDashboard,
  generateNotebookMaster,
  deriveScore,
  assignTiers
};
