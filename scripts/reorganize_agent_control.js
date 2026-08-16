const fs = require('fs');
const path = require('path');

const TARGET_DIR = path.join(__dirname, '..', 'data', 'notebooklm_sources - コピー');
const AGENT_DIR = path.join(TARGET_DIR, '02_AI駆動開発_エージェント制御');

const REASSIGNMENTS = {
  'Claude Codeで動画編集を完全自動化する方法｜15分動画が100円以下で仕上がるスキル構成｜せなお.md': '03_画像_動画生成AI',
  'Claude Codeのサブエージェントで動画自動編集ツールを構築｜ハーネス設計を非コーディング領域に応用｜森本 洋平.md': '03_画像_動画生成AI',
  'note記事を“生成して終わり”にしない執筆ハーネスを作った｜hirokaji.md': '06_業務効率化_自動化',
  'Claude Codeで投資AI秘書を作った1ヶ月｜個人投資家が「やらかさないAI」を作った話｜malfoy_eatwalk.md': '05_ビジネス_起業_アイデア発想',
  'Claude CodeのエージェントでAIコンサルタントを構築する｜McKinsey流フレームワークの実装方法 #ClaudeCode - Qiita.md': '05_ビジネス_起業_アイデア発想',
  'ClaudeCodeとGeminiで「個人資産運用最適化システム」を作ってみた〜〜〜！.md': '05_ビジネス_起業_アイデア発想',
  'Claudeボット3体で日利$1,967 — 並列取引システムの設計｜鬼徹.md': '05_ビジネス_起業_アイデア発想',
  '【暴落も自動回避】コード経験ゼロの会社員がAIに売買タイミングを判定させたら利益が出た話｜ましゅ｜競馬AIで3万円チャレンジ中.md': '05_ビジネス_起業_アイデア発想',
  '【アイデア創出における「逆説」】｜Mu no Tama.md': '05_ビジネス_起業_アイデア発想',
  'リピーターが増える人は、テーマパーク的に考えている。｜井口宏大｜マーケティング翻訳家.md': '05_ビジネス_起業_アイデア発想',
  'YouTube修理動画をAIで解析して自動で修理ナレッジサイトを作ってみた #Python - Qiita.md': '06_業務効率化_自動化',
  '「言わなくても動く参謀」を目指して。自分専用AIエージェント「秘書M」をゼロから作った話（Phase 1_ MVP編） - Qiita.md': '06_業務効率化_自動化',
  '【マジクラ】 NotebookLMのソース、実は一括ダウンロードできます｜まじん.md': '07_リサーチ_思考整理_NotebookLM',
  'NotebookLMの学習ノート作成をAIで自動化する - Qiita.md': '07_リサーチ_思考整理_NotebookLM',
  '【AI駆動開発】Gemini Gem＋NotebookLMによる上流工程の最適化戦略.md': '07_リサーチ_思考整理_NotebookLM',
  '「段階的開示学習」のススメ — Skillsの仕組みを人間の学習に転用.md': '07_リサーチ_思考整理_NotebookLM',
  'あとで読む（読まない）を何とかしたい｜星影｜Tech Hunter.md': '07_リサーチ_思考整理_NotebookLM'
};

function main() {
  let count = 0;
  for (const [file, destCat] of Object.entries(REASSIGNMENTS)) {
    const srcPath = path.join(AGENT_DIR, file);
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

  console.log(`\n合計 ${count} 件のファイルを再配置しました。`);
}

main();
