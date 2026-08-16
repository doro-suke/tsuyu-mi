const fs = require('fs');
const path = require('path');

const TARGET_DIR = path.join(__dirname, '..', 'data', 'notebooklm_sources - コピー');
const UNCLASSIFIED_DIR = path.join(TARGET_DIR, '08_その他_未分類');

const MANUAL_MAPPING = {
  "3年間観察した結果、人々のAI活用レベルを10段階に分類しました｜Trans-N.md": "07_リサーチ_思考整理_NotebookLM",
  "AI tips slide.md": "02_AI駆動開発_エージェント制御",
  "ClaudeのAPI費用が激減。システムプロンプトを「画像」として読ませる新ツールの仕組み.md": "02_AI駆動開発_エージェント制御",
  "DevContainerより軽量？Devboxで開発環境を瞬時に作る.md": "02_AI駆動開発_エージェント制御",
  "Netflixが新たに開発した動画編集フレームワーク「VOID」を発表、動画から任意の物体を消した場合に残りの物体の動きを物理シミュレーションして映像を生成可能 - GIGAZINE.md": "03_画像_動画生成AI",
  "WebBigData.md": "07_リサーチ_思考整理_NotebookLM",
  "「Gemini」アプリが動的コンテンツ回答に対応、触って理解できるシミュレーターも生成 - 窓の杜.md": "02_AI駆動開発_エージェント制御",
  "「Google ドライブ」の散らかったファイルをGeminiが自動で整理してくれるように／表示言語が英語に設定されているユーザー向けに提供.md": "06_業務効率化_自動化",
  "【2026年最新】Multi-Agentフレームワーク徹底比較：CrewAI vs AutoGen vs LangGraph — SME（中小企業）が選ぶべき「最適解」とは？ - Qiita.md": "02_AI駆動開発_エージェント制御",
  "アプリ開発未経験から、個人開発で月1万円稼ぐまでの話｜のすけ _ 個人開発.md": "05_ビジネス_起業_アイデア発想",
  "売上予測ツールを個人開発してリリースした話——FastAPI + Prophet + React.md": "05_ビジネス_起業_アイデア発想",
  "統計検定：Japan Statistical Society Certificate.md": "07_リサーチ_思考整理_NotebookLM"
};

function main() {
  if (!fs.existsSync(UNCLASSIFIED_DIR)) {
    console.log('未分類フォルダが存在しません。');
    return;
  }

  const files = fs.readdirSync(UNCLASSIFIED_DIR).filter(f => f.endsWith('.md'));
  for (const file of files) {
    const targetCategory = MANUAL_MAPPING[file] || '08_その他_未分類';
    if (targetCategory !== '08_その他_未分類') {
      const srcPath = path.join(UNCLASSIFIED_DIR, file);
      const destDir = path.join(TARGET_DIR, targetCategory);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      const destPath = path.join(destDir, file);
      fs.renameSync(srcPath, destPath);
      console.log(`移動: ${file} -> ${targetCategory}`);
    }
  }

  const remaining = fs.readdirSync(UNCLASSIFIED_DIR);
  if (remaining.length === 0) {
    fs.rmdirSync(UNCLASSIFIED_DIR);
    console.log('未分類フォルダが空になったため削除しました。');
  }
}

main();
