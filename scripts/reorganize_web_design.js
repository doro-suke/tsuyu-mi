const fs = require('fs');
const path = require('path');

const TARGET_DIR = path.join(__dirname, '..', 'data', 'notebooklm_sources - コピー');
const WEB_DIR = path.join(TARGET_DIR, '01_Webデザイン_UIUX');

const REASSIGNMENTS = {
  // 03_画像_動画生成AI へ
  '2026年決定版：ローカルStable Diffusionで絶対に入れるべきアニメ特化モデル3選｜兼城朝陽(カネシロアサヒ).md': '03_画像_動画生成AI',
  'AIで爆美女を描く方法😍.md': '03_画像_動画生成AI',
  'ASMR環境音動画を無料ローカルで量産する （全2回の第1回）：前編 ― 静止画に「本物の雨」を降らせる物理シミュとシームレスループ.md': '03_画像_動画生成AI',
  'ComfyUI Spectrum SDXL Nodeが超進化！｜ひろろひ🐈‍⬛StabilityMatrix推し.md': '03_画像_動画生成AI',
  'ComfyUI でクリエイティブな自由を手に入れろ！①『Z-Image-Turbo』LoRA + Amazing Z-Image Workflow v4.0｜One More Vision.md': '03_画像_動画生成AI',
  'ComfyUI で画像を生成してみる.md': '03_画像_動画生成AI',
  'ComfyUI はなぜ最強なのか？ オープンソースのエコシステムと未来の課題 【画像生成 AI】｜きまま _ Easygoing.md': '03_画像_動画生成AI',
  'ComfyUIでAnima preview 2を試してみた｜混合順.md': '03_画像_動画生成AI',
  'ComfyUIでFlux AIを使う方法：詳細ガイド.md': '03_画像_動画生成AI',
  'ComfyUIでsdxs-1bを試してみた｜混合順.md': '03_画像_動画生成AI',
  'ComfyUI用のKawaiiNodesを作った.md': '03_画像_動画生成AI',
  'PythonでComfyUIのAPIを操作してブログ記事用の自動画像生成システムの構築.md': '03_画像_動画生成AI',
  'Stable Diffusion挫折しない順番——2026年版、最初の選択肢と正直なロードマップ~ComfyUI Desktop、ポータブル版、クラウドの3ルートを環境別に整理~｜最新技術研究所@フォ.md': '03_画像_動画生成AI',
  'YouTube動画制作を丸投げできる最強AIエージェント③課金せずに静止画から動画を生成する方法 ～AntigravityとComfyUI～｜古谷健治｜70歳の動画制作.md': '03_画像_動画生成AI',
  'Z-Image-Turbo ComfyUI・完全ワークフロー（完全無料でダウンロードできます・実際に生成した画像サンプル付き）・HuggingFaceの無料枠CPU（２コア・１８GBRAM）でZ-Im.md': '03_画像_動画生成AI',
  'anima_pencil-XL_clear_v2 を公開！ 自然な色表現 と 簡単に使える ComfyUI ワークフロー 【画像生成 AI】｜きまま _ Easygoing.md': '03_画像_動画生成AI',
  '【ComfyUI で完全解放⁉️】SFWもNSFWも制限なしで、もうAIに拒否されない！話題の『Qwen 3.5 非検閲モデル』を導入する全手順を暴露します｜ハカセ アイ (Ai-Hakase)🐱Y.md': '03_画像_動画生成AI',
  '【ComfyUI】イラストの手や顔を自動で修正するワークフロー｜不可思議ちゃん@AI漫画でkindle出版.md': '03_画像_動画生成AI',
  '【ComfyUI】ドット絵を作ろう その2｜つみき.md': '03_画像_動画生成AI',
  '【ComfyUI】ドット絵を作ろう！｜つみき.md': '03_画像_動画生成AI',
  '【保存版】ComfyUIプロンプト地獄から卒業！入力を劇的に楽にする「3つの神ノードと1つの補助ノード」完全攻略｜導NoaのComfyUI検証ラボ｜ノード解説と実践ワークフロー.md': '03_画像_動画生成AI',
  '【初心者向け】PythonでComfyUIのAPIを操作して画像生成を自動化しよう！.md': '03_画像_動画生成AI',
  '【検証】Animagine XL V4.0 × Radeon｜「800万枚学習の英知」召喚ログ ｜ ComfyUI｜SDXL｜RX9060XT｜AIart｜｜えすた_esuta ｜Radeon AI .md': '03_画像_動画生成AI',
  '推しキャラ量産！ComfyUI×LLM自動プロンプト生成「anima-pipeline」.md': '03_画像_動画生成AI',
  '超複雑なバトルスーツの装着シーンを効率よく制作する／ComfyUIにアプリモード、初心者でも「超複雑なワークフロー」が利用可能に！｜CreativeEdge CL+.md': '03_画像_動画生成AI',

  // 04_ゲーム開発 へ
  'AIに伴走してもらってUnityでゲームを作る（1）｜Doui Lab.md': '04_ゲーム開発',
  'Codex で弾幕シューティングゲームの生成を試す｜npaka.md': '04_ゲーム開発',
  'ゲームにもPlaywrightのようなUIテストを。Guaを作りました.md': '04_ゲーム開発',
  '個人開発ゲームを「遊べる」レベルまで磨いた全記録.md': '04_ゲーム開発',

  // 02_AI駆動開発_エージェント制御 へ
  'AIに渡す指示書の役割分担_ AGENTS.md_SKILL.md_DESIGN.mdと仕様駆動開発の現在地.md': '02_AI駆動開発_エージェント制御',
  'AIエージェントに丸投げ！ローカル生成AI 最強環境構築術！#1-1｜Genzoh.md': '02_AI駆動開発_エージェント制御',
  'AntigravityとClaudeCodeの相性について。｜AI駆動塾.md': '02_AI駆動開発_エージェント制御',
  'Claude Code × tmuxの個人的活用術 _ DevelopersIO.md': '02_AI駆動開発_エージェント制御',
  'Claude Codeに全部抱え込ませるのをやめた。tmuxのタブを会話させてコンテキストを分割する.md': '02_AI駆動開発_エージェント制御',
  'Claude CodeのAgent Skillsで学習ログを自動化しながらRustでWeb APIを作った.md': '02_AI駆動開発_エージェント制御',
  'Claude Codeの並列作業で「画面に張り付く」をやめるためにやったこと.md': '02_AI駆動開発_エージェント制御',
  '個人のプロンプト術をやめて、チームで回るAI駆動開発ループを作った話.md': '02_AI駆動開発_エージェント制御',

  // 05_ビジネス_起業_アイデア発想 へ
  'React + Python + Supabase で AI 株価予測 × ポートフォリオ最適化のフルスタックアプリを作ってみた - Qiita.md': '05_ビジネス_起業_アイデア発想',
  'エンジニア未経験でも一目置かれるポートフォリオ。ビジネス視点で顧客に価値を届ける。 #初心者 - Qiita.md': '05_ビジネス_起業_アイデア発想',

  // 06_業務効率化_自動化 へ
  'Codex の承認疲れを減らす常駐デスクトップアプリを Tauri + Rust + UI Automation で作る - Qiita.md': '06_業務効率化_自動化',
  '【初学者向け】システム全体を理解するための5つの視点 - Qiita.md': '06_業務効率化_自動化',
  '要件定義とは何か？開発メンバー初心者向けガイド - Qiita.md': '06_業務効率化_自動化'
};

function main() {
  let count = 0;
  for (const [file, destCat] of Object.entries(REASSIGNMENTS)) {
    const srcPath = path.join(WEB_DIR, file);
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
