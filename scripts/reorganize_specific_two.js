const fs = require('fs');
const path = require('path');

const TARGET_DIR = path.join(__dirname, '..', 'data', 'notebooklm_sources - コピー');
const RESEARCH_DIR = path.join(TARGET_DIR, '07_リサーチ_思考整理_NotebookLM');

const REASSIGNMENTS = {
  '3年間観察した結果、人々のAI活用レベルを10段階に分類しました｜Trans-N.md': '02_AI駆動開発_エージェント制御',
  'ずらす力 －AI時代に「正解」より価値ある 問いの技術－ 【第1回】創造の民主化へ｜Ronron（ロンロン）.md': '05_ビジネス_起業_アイデア発想'
};

function main() {
  let count = 0;
  for (const [file, destCat] of Object.entries(REASSIGNMENTS)) {
    const srcPath = path.join(RESEARCH_DIR, file);
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
