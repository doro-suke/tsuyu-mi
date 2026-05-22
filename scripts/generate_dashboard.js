const fs = require('fs');
const path = require('path');

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

/**
 * 優先度に応じたカラークラスを返す
 */
function getPriorityClasses(priority) {
  switch (priority.toLowerCase()) {
    case 'high':
      return {
        border: 'border-red-500',
        badge: 'bg-red-100 text-red-800',
        label: 'High'
      };
    case 'medium':
      return {
        border: 'border-amber-400',
        badge: 'bg-amber-100 text-amber-800',
        label: 'Medium'
      };
    case 'low':
      return {
        border: 'border-gray-300',
        badge: 'bg-gray-100 text-gray-600',
        label: 'Low'
      };
    default:
      return {
        border: 'border-blue-300',
        badge: 'bg-blue-100 text-blue-800',
        label: priority
      };
  }
}

/**
 * 記事1件分のHTMLカードを生成する
 */
function generateArticleCard(article) {
  const classes = getPriorityClasses(article._tier);
  const score = deriveScore(article);
  const tagsHtml = article.tags.map(tag =>
    `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700 mr-1 mb-1">#${tag}</span>`
  ).join('');

  const mdRelPath = article.markdown_path ? `../${article.markdown_path}` : '#';

  return `
    <div class="article-card flex flex-col bg-white rounded-lg shadow-md overflow-hidden border-t-4 ${classes.border} transition transform hover:-translate-y-1 hover:shadow-lg"
         data-title="${article.title.replace(/"/g, '&quot;')}"
         data-summary="${article.summary.replace(/"/g, '&quot;')}"
         data-priority="${article._tier}"
         data-score="${score}"
         data-tags="${article.tags.join(',')}"
         data-article-id="${article.id}">
        <div class="px-6 py-4 flex-grow">
            <div class="flex justify-between items-start mb-2">
                <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold ${classes.badge}">
                    ${classes.label} <span class="opacity-70">· ${score}</span>
                </span>
                <div class="flex items-center gap-2">
                    <button onclick="toggleStatus('${article.id}')" class="toggle-status-btn text-xs font-medium text-indigo-600 hover:text-indigo-800 underline">既読にする</button>
                    <button onclick="deleteArticle('${article.id}')" class="text-xs font-medium text-red-500 hover:text-red-700 underline ml-1">削除</button>
                    <span class="text-xs text-gray-400">${new Date(article.analyzed_at).toLocaleDateString('ja-JP')}</span>
                </div>
            </div>
            <h2 class="text-xl font-bold mb-3 line-clamp-2 hover:text-indigo-600">
                <a href="${article.url}" target="_blank">${article.title}</a>
            </h2>
            <div class="text-gray-600 text-sm mb-4 space-y-1">
                ${article.summary.split('\n').map(line => `<p>・ ${line}</p>`).join('')}
            </div>
            <div class="bg-gray-50 p-3 rounded-md mb-4">
                <p class="text-xs font-bold text-gray-500 uppercase mb-1">今読む理由</p>
                <p class="text-sm text-gray-700 italic">${article.read_now_reason}</p>
            </div>
            <div class="mt-auto">
                ${tagsHtml}
            </div>
        </div>
        <div class="px-6 py-4 bg-gray-50 border-t border-gray-100 grid grid-cols-2 gap-2">
            <a href="${article.url}" target="_blank" class="inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
                記事を読む
            </a>
            <a href="${mdRelPath}" target="_blank" class="inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                AI用ソース
            </a>
        </div>
    </div>
  `;
}

async function main() {
  const dataPath = path.join(__dirname, '..', 'data', 'bookmarks.json');
  const templatePath = path.join(__dirname, '..', 'templates', 'dashboard_template.html');
  const outputPath = path.join(__dirname, '..', 'docs', 'index.html');

  if (!fs.existsSync(dataPath) || !fs.existsSync(templatePath)) {
    console.error('エラー: 必要ファイルが見つかりません。');
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  const template = fs.readFileSync(templatePath, 'utf8');

  assignTiers(data.articles);
  const sortedArticles = [...data.articles].sort((a, b) => deriveScore(b) - deriveScore(a));

  // 全タグの収集
  const allTags = new Set();
  sortedArticles.forEach(a => a.tags.forEach(t => allTags.add(t)));
  const tagsHtml = Array.from(allTags).sort().map(tag => 
    `<button onclick="filterTag('${tag}')" class="tag-btn inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100" data-tag="${tag}">#${tag}</button>`
  ).join('');

  // 記事カードの生成
  const articlesHtml = sortedArticles.map(generateArticleCard).join('\n');

  // テンプレートへの埋め込み
  const finalHtml = template
    .replace('{{last_updated}}', new Date(data.updated_at).toLocaleString('ja-JP'))
    .replace('<!-- TAGS_PLACEHOLDER -->', tagsHtml)
    .replace('<!-- ARTICLES_PLACEHOLDER -->', articlesHtml);

  // ファイル書き出し
  fs.writeFileSync(outputPath, finalHtml, 'utf8');

  console.log(`ダッシュボードを高度化しました: ${outputPath}`);
  console.log(`合計 ${sortedArticles.length} 件の記事を表示しています。`);
}

main();
