# PythonでComfyUIのAPIを操作してブログ記事用の自動画像生成システムの構築
- **Source URL**: https://zenn.dev/sunwood_ai_labs/articles/1978b73f3daa33
- **Score**: 85
- **AI Summary**:
  - Gemini APIを用いてブログ記事から最適な画像生成プロンプトを自動抽出する手法の解説
  - ComfyUIのAPIを利用しPythonからワークフローを動的に操作する具体的な実装コードの提示
  - 記事抽出から画像生成キュー投入までの自動化パイプラインの構築手順を体系的に網羅
- **Read Now Reason**: ComfyUIのワークフローJSONをPythonで動的に書き換えてAPI実行する具体的コードがあり、自動化パイプライン構築に直結するため。
- **Suggested Tags**: #ComfyUI, #Python, #Gemini, #自動化パイプライン, #画像生成
- **Processed Date**: 2026/5/13

---

## 本文
はじめに
ブログの魅力を高める上で、適切な画像の使用は非常に重要です。しかし、毎回手動で画像を選択したり作成したりするのは、時間と労力がかかります。そこで、ブログの内容に基づいて自動的に画像を生成するシステムを構築することで、この問題を解決できます。
本記事では、Python を使用してブログ記事の内容を分析し、それに基づいて適切な画像を自動生成するシステムの実装方法について詳しく解説します。

 デモ動画

 システムの概要
まず、システム全体の流れを理解しましょう。以下の図は、ブログ画像生成システムの基本的な流れを示しています。

ブログ記事から一部を抽出します。
抽出した内容を基に、AI を使って画像生成用のプロンプトを作成します。
画像生成ワークフローをカスタマイズします。
画像生成タスクをキューに追加します。
外部サービスによって画像が生成されます。

それでは、各ステップについて詳しく見ていきましょう。

 環境設定
システムを正しく動作させるためには、適切な環境設定が不可欠です。以下の図は、必要な環境変数の設定を示しています。
必要な環境変数は以下の通りです：


BLOG_PATH: ブログ記事のファイルパス

SERVER_ADDRESS: 画像生成サーバーのアドレス

WORKFLOW_PATH: 画像生成ワークフローのファイルパス

GEMINI_API_KEY: Gemini API のキー

これらの環境変数は、.env ファイルに記述し、python-dotenv ライブラリを使用して読み込みます。
from dotenv import load_dotenv
load_dotenv()  # .env ファイルから環境変数を読み込む

 BlogImageGenerator クラスの実装
次に、BlogImageGenerator クラスの実装について詳しく見ていきましょう。

 初期化メソッド
def __init__(self):
    load_dotenv()
    self.blog_path = os.getenv('BLOG_PATH')
    self.server_address = os.getenv('SERVER_ADDRESS')
    self.workflow_path = os.getenv('WORKFLOW_PATH')
    self.api_key = os.getenv('GEMINI_API_KEY')
    if not all([self.blog_path, self.server_address, self.workflow_path, self.api_key]):
        raise ValueError("必要な環境変数が設定されていません。.env ファイルを確認してください。")
初期化メソッドでは、環境変数を読み込み、必要な変数が設定されているかチェックします。もし設定されていない場合は、ValueError を発生させます。

 ブログ記事の抽出
def extract_blog_excerpt(self, char_limit: int = 300) -> str:
    with open(self.blog_path, 'r', encoding='utf-8') as file:
        return file.read(char_limit)
このメソッドは、ブログ記事の一部（デフォルトで300文字）を抽出します。これにより、画像生成に必要な最小限の情報を取得できます。

 画像プロンプトの生成
def create_image_prompt_from_blog(self, blog_excerpt: str) -> str:
    prompt = f"下記のブログ記事の内容を表現するシンプルな画像の英語プロンプトを提案してください。英語プロンプトのみを出力してください：\n\n{blog_excerpt}"
    os.environ['GEMINI_API_KEY'] = self.api_key
    response = completion(
        model="gemini/gemini-1.5-pro-latest", 
        messages=[{"role": "user", "content": prompt}]
    )
    return response.get('choices', [{}])[0].get('message', {}).get('content', '')
このメソッドでは、Gemini API を使用して、ブログ記事の内容に基づいた画像生成プロンプトを作成します。

 画像生成ワークフローの読み込み
def load_image_generation_workflow(self) -> Dict[str, Any]:
    with open(self.workflow_path, 'r') as file:
        return json.load(file)
画像生成ワークフローを JSON ファイルから読み込みます。このワークフローは、画像生成の詳細な設定を含んでいます。

 画像生成のキューイング
def queue_image_generation(self, prompt: Dict[str, Any]) -> None:
    data = json.dumps({"prompt": prompt}).encode('utf-8')
    req = request.Request(f"http://{self.server_address}/prompt", data=data)
    request.urlopen(req)
生成された画像プロンプトを使用して、画像生成タスクをサーバーのキューに追加します。

 画像プロンプトのカスタマイズ
def customize_image_prompt(self, workflow: Dict[str, Any], content: str) -> Dict[str, Any]:
    workflow["283"]["inputs"]["text"] = f"""
    3D low poly model of [{content}], 
    isometric view, 
    2D game art style, 
    light background, 
    soft lighting, 
    low detail, white background, Intricate details and realistic textures,
    """
    workflow["271"]["inputs"]["seed"] = random.randint(1, 1000000)
    return workflow
このメソッドでは、生成された画像プロンプトを基に、画像生成ワークフローをカスタマイズします。3D低ポリモデル、アイソメトリックビュー、2Dゲームアートスタイルなどの特徴を指定しています。

 メイン処理の実装
最後に、メイン処理を実装します。
def main():
    try:
        generator = BlogImageGenerator()
        generator.generate_blog_image()
    except ValueError as e:
        print(f"エラー: {e}")
    except Exception as e:
        print(f"予期せぬエラーが発生しました: {e}")

if __name__ == "__main__":
    main()
メイン処理では、BlogImageGenerator クラスのインスタンスを作成し、generate_blog_image メソッドを呼び出します。エラーハンドリングも適切に行っています。

 システムの動作フロー
以下の図は、システム全体の動作フローを示しています。

 全体コード
import json
import random
import os
from urllib import request
from typing import Dict, Any
from dotenv import load_dotenv

from litellm import completion

class BlogImageGenerator:
    def __init__(self):
        load_dotenv()  # .env ファイルから環境変数を読み込む
        self.blog_path = os.getenv('BLOG_PATH')
        self.server_address = os.getenv('SERVER_ADDRESS')
        self.workflow_path = os.getenv('WORKFLOW_PATH')
        self.api_key = os.getenv('GEMINI_API_KEY')

        if not all([self.blog_path, self.server_address, self.workflow_path, self.api_key]):
            raise ValueError("必要な環境変数が設定されていません。.env ファイルを確認してください。")

    def extract_blog_excerpt(self, char_limit: int = 300) -> str:
        with open(self.blog_path, 'r', encoding='utf-8') as file:
            return file.read(char_limit)

    def create_image_prompt_from_blog(self, blog_excerpt: str) -> str:
        prompt = f"下記のブログ記事の内容を表現するシンプルな画像の英語プロンプトを提案してください。英語プロンプトのみを出力してください：\n\n{blog_excerpt}"
        os.environ['GEMINI_API_KEY'] = self.api_key
        response = completion(
            model="gemini/gemini-1.5-pro-latest", 
            messages=[{"role": "user", "content": prompt}]
        )
        return response.get('choices', [{}])[0].get('message', {}).get('content', '')

    def load_image_generation_workflow(self) -> Dict[str, Any]:
        with open(self.workflow_path, 'r') as file:
            return json.load(file)

    def queue_image_generation(self, prompt: Dict[str, Any]) -> None:
        data = json.dumps({"prompt": prompt}).encode('utf-8')
        req = request.Request(f"http://{self.server_address}/prompt", data=data)
        request.urlopen(req)

    def customize_image_prompt(self, workflow: Dict[str, Any], content: str) -> Dict[str, Any]:
        workflow["283"]["inputs"]["text"] = f"""
        3D low poly model of [{content}], 
        isometric view, 
        2D game art style, 
        light background, 
        soft lighting, 
        low detail, white background, Intricate details and realistic textures,
        """
        workflow["271"]["inputs"]["seed"] = random.randint(1, 1000000)
        return workflow

    def generate_blog_image(self) -> None:
        blog_excerpt = self.extract_blog_excerpt()
        image_prompt = self.create_image_prompt_from_blog(blog_excerpt)
        print(f"生成された画像プロンプト: {image_prompt}")

        workflow = self.load_image_generation_workflow()
        customized_prompt = self.customize_image_prompt(workflow, image_prompt)
        self.queue_image_generation(customized_prompt)
        print("ブログ画像の生成をキューに追加しました。")

def main():
    try:
        generator = BlogImageGenerator()
        generator.generate_blog_image()
    except ValueError as e:
        print(f"エラー: {e}")
    except Exception as e:
        print(f"予期せぬエラーが発生しました: {e}")

if __name__ == "__main__":
    main()


 まとめ
本記事では、Python を使用してブログ記事の内容に基づいて自動的に画像を生成するシステムの実装方法について解説しました。このシステムを利用することで、ブロガーは記事作成に集中し、魅力的な画像の生成を自動化することができます。
主な特徴は以下の通りです：

環境変数を使用した柔軟な設定
Gemini API を活用した画像プロンプトの生成
カスタマイズ可能な画像生成ワークフロー
エラーハンドリングによる堅牢性

このシステムをさらに発展させるためのアイデアとしては、以下のようなものが考えられます：

生成された画像の品質チェック機能の追加
複数の画像生成サービスの統合
ユーザーフィードバックに基づく画像生成プロンプトの改善

ブログ記事の自動画像生成システムを導入することで、コンテンツ制作の効率が大幅に向上し、より魅力的なブログを運営することができるでしょう。
