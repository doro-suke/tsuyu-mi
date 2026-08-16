const fs = require('fs');
const path = require('path');

const TARGET_DIR = path.join(__dirname, '..', 'data', 'notebooklm_sources - コピー');
const AUTO_DIR = path.join(TARGET_DIR, '06_業務効率化_自動化');

const REASSIGNMENTS = {
  'AI にコードを任せても壊れない人がやっていること.md': '02_AI駆動開発_エージェント制御',
  'Codex の承認疲れを減らす常駐デスクトップアプリを Tauri + Rust + UI Automation で作る - Qiita.md': '02_AI駆動開発_エージェント制御',
  '【初学者向け】システム全体を理解するための5つの視点 - Qiita.md': '02_AI駆動開発_エージェント制御',
  '要件定義とは何か？開発メンバー初心者向けガイド - Qiita.md': '02_AI駆動開発_エージェント制御',
  'Gemini×NotebookLMを使い倒せ！起業でAIを活用する方法【実行編⑦】｜歌川貴之＠​起業家顧問.md': '05_ビジネス_起業_アイデア発想'
};

function main() {
  let count = 0;
  for (const [file, destCat] of Object.entries(REASSIGNMENTS)) {
    const srcPath = path.join(AUTO_DIR, file);
    if (fs.existsSync(srcPath)) {
      const destDir = path.join(TARGET_DIR, destCat);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      const destPath = path.join(destDir, file);
      fs.renameSync(srcPath, destPath);
      console.log(`移動完了: [${file}] -> [${destCat}]`);
      count++;
    } else {
      console.warn(`ファイルが見つかりませんでした: ${file}`);
    }
  }

  console.log(`\n合計 ${count} 件のファイルを移動しました。`);
}

main();
