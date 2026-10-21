# Claude × Nano Banana Pro で料理漫画を自動生成するパイプラインを作った - Qiita
- **Source URL**: https://qiita.com/yongyong/items/cabcfb8c91b857cc164f
- **Score**: 82
- **Suggested Tags**: #自動化パイプライン, #画像生成AI, #Python
- **Processed Date**: 2026/10/21

---

## 本文
TL;DR


Claude Opus でキャラクター設定とCSV形式のシナリオを作成

Nano Banana Pro でキャラクター画像・背景・漫画ページを生成

Python でCSV駆動の自動生成パイプラインを構築

Canva で誤字脱字を修正（Nano Banana Proは日本語テキストが苦手）
完成した漫画は LINE Mini App で公開中
動画版はこちらから



完成した漫画のサムネイル

はじめに
個人開発で料理アプリ「CookForYou」を作っています。
開発中にあることに気づきました。料理の「盛り付け」を体系的に教えているコンテンツがほとんどない。レシピ動画は無限にある。調理の動画も山ほどある。でも「なぜこの盛り付けが美味しそうに見えるのか」を解説しているものは驚くほど少ない。
プロの料理人は感覚で知っている。でも一般の人は「なんかオシャレに盛れない…」で終わってしまう。
そこで「盛り付けの基本を学べるコンテンツ」を作ることにしました。ただ、文章だけの解説は読まれない。かといってプロに漫画を依頼すると数十万円。そこで考えたのが 「AIだけで漫画を量産するパイプライン」 です。

なぜ漫画なのか


視覚的に伝わる: 料理の盛り付けは「見た目」が全て。Before/Afterを漫画で見せると一目瞭然

ストーリーで記憶に残る: 「黒ごまを振ると高級感が出る」という知識も、キャラクターの会話で伝えると印象に残る

SNSで拡散されやすい: 縦長の漫画形式はInstagramやTikTokと相性が良い


なぜ今できるようになったか
2024年末〜2025年にかけて、Googleの画像生成AI Nano Banana Pro（API名: gemini-3-pro-image-preview）の能力が劇的に向上しました。
特に重要なのが 「参照画像を渡すとキャラクターの一貫性を保てる」 という機能。これにより、同じキャラクターが登場する連続した漫画ページを生成できるようになりました。

全体アーキテクチャ


ポイント: 設定画（キャラクター・背景）を先に生成し、それを参照画像としてNano Banana Proに渡すことで、漫画全体の一貫性を保っています。

Step 1: キャラクター設計（Claude Opusと相談）
なぜキャラクター設計が必要か？
Nano Banana Proは参照画像を渡すと、その画像のキャラクターや背景を維持したまま新しいシーンを生成できます。つまり、最初に「設定画」を作っておけば、漫画全体でキャラクターの一貫性を保てるということ。
逆に設定画なしで毎回「黒髪の男性」とプロンプトで指定しても、ページごとに顔が変わってしまいます。
そこで、まずClaudeとキャラクター設定を詰めました。「よつばと!」のような日常系の雰囲気で、料理初心者の彼氏と料理上手な彼女という設定です。

キャラクター設定
ユウタ（25歳、男性）

職業: ITエンジニア
料理スキル: ほぼゼロ（カップ麺、チャーハン程度）
性格: 真面目だけどドジ、失敗から「なるほど！」と学ぶタイプ
服装: 無地Tシャツ＋スウェットパンツ

ミナ（24歳、女性）

職業: 事務職（料理は趣味）
料理スキル: 中〜上級、盛り付けは自然とできる
性格: しっかり者だけど厳しくない、優しくツッコむ
服装: シンプルなニット＋エプロン


舞台設定

1LDKマンション（同棲3ヶ月目）
IKEA/ニトリ系のシンプルな北欧風インテリア
カウンターキッチン、2口IH、丸いダイニングテーブル


Step 2: キャラクター画像生成（Nano Banana Pro）
キャラクター設定をもとに、Nano Banana Proで設定画を生成しました。

プロンプト例（ユウタ）
Simple manga character design sheet, Yotsuba&! style by Kiyohiko Azuma, 
young Japanese man age 25, short black hair, round friendly eyes, 
soft facial features, wearing plain gray t-shirt and black sweatpants, 
standing pose with 3 expression variations (normal, surprised with sweat drop, 
happy with sparkle effects), full body in center, white background, 
clean line art, flat colors, warm and approachable expression, 
manga illustration, pastel color palette


生成結果


背景も同様に生成しました。



Step 3: CSV駆動の漫画生成パイプライン

CSVフォーマット
Claudeと相談して、以下のCSVフォーマットを決めました。
ページ,コマ,コマサイズ,シーン説明,キャラクター,セリフ,漫画部分プロンプト,実写料理プロンプト,備考
1,1,大,ユウタが和食を洋食っぽく盛り付けてしまう,ユウタ,肉じゃが作った！大皿にドーンと盛ったよ！,"被写体：ユウタがダイニングテーブルの前に立ち、大きな白い丸皿を持っている。得意げな笑顔。 構図：テーブルを挟んでユウタの上半身。 場所：1LDKマンションのダイニング、夜。 スタイル：よつばと!風、フルカラー、パステルカラー。","肉じゃがを白い丸皿に山盛り、洋食風の盛り付け、違和感がある",導入
1,2,中,ミナが微妙な反応,ミナ,美味しそうだけど…なんか和食っぽくないかも,"被写体：ミナがテーブルに座り、皿を見ている。首をかしげている。 構図：バストアップ。 スタイル：よつばと!風、フルカラー。",,

ポイントは「漫画部分プロンプト」と「実写料理プロンプト」を分けていること。料理の実写写真を別途用意して組み合わせる想定でしたが、今回はNano Banana Proに漫画風の料理も描いてもらいました。

Pythonコード

tools/generate_image.py
Nano Banana Pro APIを呼び出す基本モジュールです。
"""
Nano Banana Pro 画像生成（複数画像対応）

Usage:
    python -m tools.generate_image "猫のイラスト"
    python -m tools.generate_image "猫のイラスト" -o cat.png
    python -m tools.generate_image "猫" "犬" "鳥" -o cat.png dog.png bird.png
    python -m tools.generate_image "風景" --aspect 16:9 --size 2K
"""

import argparse
import sys
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from io import BytesIO

from PIL import Image
from google.genai import types
from google import genai
from retry import retry


def load_and_resize_images(image_paths: list[str | Path], size: tuple[int, int] = (200, 200)) -> list[bytes]:
    """
    画像を読み込んでリサイズし、バイトデータのリストとして返す

    Args:
        image_paths: 画像ファイルのパスのリスト
        size: リサイズ後のサイズ (width, height)

    Returns:
        リサイズされた画像のバイトデータのリスト
    """
    images = []
    for path in image_paths:
        img = Image.open(path)
        img_resized = img.resize(size, Image.Resampling.LANCZOS)
        buffer = BytesIO()
        img_resized.save(buffer, format="PNG")
        images.append(buffer.getvalue())
    return images


@retry(
    exceptions=Exception,
    tries=5,
    delay=2,
    backoff=2,
    jitter=(0, 1),
)
def generate_image(
    prompt: str,
    aspect_ratio: str = "1:1",
    image_size: str = "1K",
    model: str = "gemini-3-pro-image-preview",
    input_images: list[bytes] | None = None,
) -> dict | None:
    """
    Nano Banana Pro で画像を生成

    Args:
        prompt: 生成プロンプト
        aspect_ratio: アスペクト比 ("1:1", "16:9", "9:16", "3:2", "4:3")
        image_size: 解像度 ("1K", "2K", "4K")
        model: 使用するモデル名
        input_images: 入力画像のバイトデータのリスト（オプション）

    Returns:
        {"data": bytes, "text": str | None, "prompt": str} 失敗時は None
    """
    client = genai.Client(vertexai=True, project="your-project", location="global")

    contents = []
    if input_images:
        for img_data in input_images:
            contents.append(
                types.Part.from_bytes(
                    data=img_data,
                    mime_type="image/png",
                )
            )
    contents.append(prompt)

    response = client.models.generate_content(
        model=model,
        contents=contents,
        config=types.GenerateContentConfig(
            response_modalities=["TEXT", "IMAGE"],
            image_config=types.ImageConfig(
                aspect_ratio=aspect_ratio,
                image_size=image_size,
            ),
        ),
    )

    result = {"data": None, "text": None, "prompt": prompt}

    for part in response.candidates[0].content.parts:
        if hasattr(part, "inline_data") and part.inline_data:
            result["data"] = part.inline_data.data
        elif hasattr(part, "text") and part.text:
            result["text"] = part.text

    if not result["data"]:
        raise ValueError("Failed to generate image: no image data returned")

    return result


def generate_images(
    prompts: list[str],
    aspect_ratio: str = "1:1",
    image_size: str = "1K",
    model: str = "gemini-3-pro-image-preview",
    max_workers: int = 3,
) -> list[dict]:
    """
    複数の画像を同時に生成

    Args:
        prompts: 生成プロンプトのリスト
        aspect_ratio: アスペクト比
        image_size: 解像度
        model: 使用するモデル名
        max_workers: 並列実行数

    Returns:
        生成結果のリスト [{"data": bytes, "text": str | None, "prompt": str}, ...]
    """
    results = []
    
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_prompt = {
            executor.submit(
                generate_image,
                prompt=prompt,
                aspect_ratio=aspect_ratio,
                image_size=image_size,
                model=model,
            ): prompt
            for prompt in prompts
        }
        
        for future in as_completed(future_to_prompt):
            prompt = future_to_prompt[future]
            try:
                result = future.result()
                results.append(result)
            except Exception as e:
                print(f"Error generating image for '{prompt}': {e}", file=sys.stderr)
                results.append({"data": None, "text": None, "prompt": prompt, "error": str(e)})
    
    return results


def save_image(data: bytes, output_path: str) -> str:
    """画像を保存"""
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    Path(output_path).write_bytes(data)
    return output_path


main.py
CSVを読み込んで漫画ページを生成するメインスクリプトです。
"""
漫画生成メインスクリプト

data/baseの画像を読み込み、200x200にresizeし、
CSVファイルに基づいてページごとに漫画を生成する
"""

import argparse
import csv
import sys
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

from tqdm import tqdm
from tools.generate_image import generate_image, load_and_resize_images


PROMPT_PREFIX = """このキャラと家をベースに漫画を作って
【重要！！】
時系列は右上->左上->右下->左下に必ず、進んでください。
左下 -> 右下にならないように！！
"""


def load_csv(csv_path: Path) -> dict[int, list[dict]]:
    """
    CSVファイルを読み込んで、ページごとにグループ化

    Args:
        csv_path: CSVファイルのパス

    Returns:
        ページ番号をキー、コマ情報のリストを値とする辞書
    """
    pages = defaultdict(list)
    
    with open(csv_path, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            page_num = int(row["ページ"].strip())
            pages[page_num].append(row)
    
    return dict(sorted(pages.items()))


def build_page_prompt(page_data: list[dict]) -> str:
    """
    ページデータからプロンプトを組み立てる
    """
    prompt_parts = []
    
    for i, panel in enumerate(page_data, 1):
        panel_size = panel.get("コマサイズ", "")
        scene = panel.get("シーン説明", "")
        character = panel.get("キャラクター", "")
        dialogue = panel.get("セリフ", "")
        manga_prompt = panel.get("漫画部分プロンプト", "")
        
        prompt_parts.append(f"コマ{i}（{panel_size}）")
        
        if scene:
            prompt_parts.append(f"【シーン】{scene}")
        if character:
            prompt_parts.append(f"【{character}】")
        if manga_prompt:
            prompt_parts.append(f"【プロンプト】{manga_prompt}")
        if dialogue:
            prompt_parts.append(f"【セリフ】{dialogue}")
        
        prompt_parts.append("")
    
    return "\n".join(prompt_parts)


def main():
    parser = argparse.ArgumentParser(description="CSVファイルから漫画を生成")
    parser.add_argument("csv_file", type=Path, help="CSVファイルのパス")
    args = parser.parse_args()
    
    csv_path = args.csv_file
    base_dir = Path("data/base")
    
    print(f"Loading CSV from {csv_path}...")
    pages = load_csv(csv_path)
    print(f"Found {len(pages)} pages")
    
    # 参照画像を読み込み（キャラ設定画、背景など）
    image_files = sorted(base_dir.glob("*.png")) + sorted(base_dir.glob("*.jpg"))
    print(f"Loading {len(image_files)} reference images...")
    resized_images = load_and_resize_images(image_files, size=(200, 200))
    
    output_dir = Path("output") / csv_path.stem
    output_dir.mkdir(parents=True, exist_ok=True)
    
    def generate_page(page_num: int, page_data: list[dict]) -> tuple[int, bool, str]:
        """ページを生成する関数"""
        output_file = output_dir / f"{page_num}.png"
        
        if output_file.exists():
            return (page_num, False, f"Page {page_num}: Already exists, skipping...")
        
        page_prompt = build_page_prompt(page_data)
        full_prompt = PROMPT_PREFIX + page_prompt
        
        result = generate_image(
            prompt=full_prompt,
            aspect_ratio="9:16",
            image_size="2K",
            input_images=resized_images,
        )
        
        output_file.write_bytes(result["data"])
        return (page_num, True, f"Page {page_num} saved to {output_file}")
    
    # 並列生成
    pages_to_generate = [
        (page_num, page_data)
        for page_num, page_data in pages.items()
        if not (output_dir / f"{page_num}.png").exists()
    ]
    
    print(f"Generating {len(pages_to_generate)} pages in parallel...")
    
    with ThreadPoolExecutor(max_workers=3) as executor:
        future_to_page = {
            executor.submit(generate_page, page_num, page_data): page_num
            for page_num, page_data in pages_to_generate
        }
        
        with tqdm(total=len(pages_to_generate), desc="Generating pages") as pbar:
            for future in as_completed(future_to_page):
                page_num, success, message = future.result()
                pbar.update(1)
    
    print(f"Completed! Output: {output_dir}")


if __name__ == "__main__":
    main()


convert_to_webp.py
生成した画像をWebPに変換して軽量化します。
"""
PNG/JPG を WebP に変換して軽量化
"""

from pathlib import Path
from PIL import Image
from tqdm import tqdm


def convert_to_webp(input_path: Path, output_path: Path, quality: int = 85):
    """画像をWebP形式に変換"""
    with Image.open(input_path) as img:
        if img.mode == 'RGBA':
            img.save(output_path, 'WEBP', quality=quality, method=6)
        else:
            img = img.convert('RGB')
            img.save(output_path, 'WEBP', quality=quality, method=6)


def main():
    finished_dir = Path("output")
    compressed_dir = Path("compressed")
    
    image_extensions = {'.png', '.jpg', '.jpeg', '.PNG', '.JPG', '.JPEG'}
    
    all_images = []
    for subdir in finished_dir.iterdir():
        if subdir.is_dir():
            for img_file in subdir.iterdir():
                if img_file.suffix in image_extensions:
                    all_images.append((subdir, img_file))
    
    print(f"Found {len(all_images)} images to convert")
    
    for subdir, img_file in tqdm(all_images, desc="Converting to WebP"):
        relative_subdir = subdir.relative_to(finished_dir)
        output_subdir = compressed_dir / relative_subdir
        output_subdir.mkdir(parents=True, exist_ok=True)
        
        output_file = output_subdir / f"{img_file.stem}.webp"
        
        if not output_file.exists():
            convert_to_webp(img_file, output_file)
    
    print(f"Output: {compressed_dir}")


if __name__ == "__main__":
    main()


ディレクトリ構成
project/
├── data/
│   └── base/           # 参照画像（キャラ設定画、背景）
│       ├── yuta.png
│       ├── mina.png
│       ├── kitchen.png
│       └── dining.png
├── output/
│   └── chapter1/       # 生成された漫画ページ
│       ├── 1.png
│       ├── 2.png
│       └── ...
├── compressed/
│   └── chapter1/       # webpに圧縮された漫画ページ
│       ├── 1.png
│       ├── 2.png
│       └── ...
├── main.py
└── tools/
    └── generate_image.py


生成結果



Step 4: Canvaで誤字修正
Nano Banana Proの画像生成は素晴らしいのですが、日本語テキストの生成が苦手という課題があります。

Before


After

「始」の横に謎の文字が入っていたので、Canvaで修正しました。

修正のコツ

Canvaに画像をアップロード
「素材」→「図形」から白い四角を配置して誤字を隠す
テキストツールで正しい文字を入力
フォントと位置を調整

この作業は手動ですが、1ページあたり2〜3分で完了します。

Step 5: WebP変換とWeb公開
最後に、convert_to_webp.py で画像サイズを最適化してWebに公開します。
python convert_to_webp.py

WebP変換で画像サイズが約90%削減されました（約6MB → 約600KB）。

学び・課題

良かった点
✅ キャラクターの一貫性: 参照画像を渡すことで、ページ間でキャラクターの見た目がほぼ統一された
✅ CSV駆動の効率化: シナリオをCSVで管理することで、修正・追加が容易
✅ 並列生成: 複数ページを同時生成できるので、1チャプター（5〜10ページ）が数分で完成

課題
⚠️ 日本語テキスト: Nano Banana Proは日本語の文字生成が苦手。Canvaでの手動修正が必須
⚠️ コマ割りの制御: 「右上→左上→右下→左下」の順序を守らせるのが難しい。プロンプトで強調しても時々崩れる
⚠️ 料理の描写: 漫画風の料理は描けるが、実写と比べると「美味しそう感」が弱い

一部公開

プロローグ











色彩編



続きはWebで
Chapter 2（色彩編）の途中までQiitaで公開していますが、続きはLINE Mini Appで 完全無料 読めます。
📖 盛り付け7つの柱 - 完全版
https://miniapp.line.me/2008548551-A86l0jJv/manga/how-to-plate
料理の盛り付けに興味がある方、AIで漫画を作りたい方の参考になれば幸いです！

お仕事のご相談
フリーランスとしてAI/LLM関連の開発をしています。
得意領域：

🤖 LLMアプリケーション開発（RAG、エージェント、チャットボット）
🔧 LINE Bot / LIFF開発
📊 スキル抽出・マッチングシステム（本業で開発中）

実績：

LangChain / LangChainJS / Flowise / Ragas / Dify へのOSSコントリビュート
Google Cloud Next Tokyo 2023 登壇
博士号取得（東京大学）、PNAS掲載

「こんなの作れる？」レベルの相談でも大丈夫です。
お気軽にDMください

X: https://twitter.com/Yoooongtae

Facebook: https://www.facebook.com/yongtaih1

Email: yong723.enjoy.everything@gmail.com


お気軽にご相談ください！💪
（複数媒体にご連絡いただけると確実です

参考リンク

Gemini API - 画像生成
google-genai Python SDK


タグ: #Claude #NanoBananaPro #Gemini #生成AI #Python #個人開発 #漫画 #画像生成
252Go to list of users who liked192Register as a new user and use Qiita more convenientlyYou get articles that match your needsYou can efficiently read back useful informationYou can use dark themeWhat you can do with signing up
