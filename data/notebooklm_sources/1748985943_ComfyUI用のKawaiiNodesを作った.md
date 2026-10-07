# ComfyUI用のKawaiiNodesを作った
- **Source URL**: https://zenn.dev/miyagawayuu/articles/kawaii-nodes-dev-blog
- **Score**: 45
- **AI Summary**:
  - ComfyUIでプロンプトを要素ごとに分解・部品化するカスタムノードの開発記録
  - LLMによる自然なプロンプト書き直しを想定した構造化出力とパラメータ設計
  - 表記揺れを防ぐクリーナーや、複数案を容易に切り替えるスイッチノードの実装
- **Read Now Reason**: LLMによるプロンプト生成と画像生成AIのパイプライン連携における、入力テキストの正規化手法やワークフローのモジュール化設計が参考になります。
- **Suggested Tags**: #ComfyUI, #プロンプトエンジニアリング, #画像生成
- **Processed Date**: 2026/6/8

---

## 本文
はじめに
ComfyUIで画像生成をしていると、プロンプトの細かい調整に意外と時間を使います。
特に「かわいいキャラクターを作りたい」という用途では、服装、髪型、表情、ポーズ、背景、ライティング、カメラ距離など、毎回かなり似た要素を手で書くことになります。
最初は1本のテキスト欄にまとめて書けば十分です。ただ、試行錯誤が増えると「今回は背景だけ変えたい」「服装だけ残して髪型を変えたい」「カメラ指定だけ別パターンにしたい」といった場面が増えてきます。
そこで、Z-Image Turbo向けのかわいい系プロンプトをComfyUI上で部品化するために、KawaiiNodes というカスタムノードパックを作りました。
この記事では、KawaiiNodesを作った背景、主なノード、Z-Image Turboへのつなぎ方、実装上の考え方を紹介します。
なお、KawaiiNodesはまだ開発中のノードパックです。この記事は開発途中の記録として書いており、完成したタイミングでGitHub上に公開する予定です。

 作ったもの
KawaiiNodesは、ComfyUIの custom_nodes に入れて使うPythonベースのカスタムノードパックです。
ComfyUI/
  custom_nodes/
    KawaiiNodes/
      __init__.py
      kawaii_nodes.py
      README.md
      sample_workflows/
ノードは KawaiiNodes/Prompt Builder カテゴリにまとまります。
主な役割は、かわいい系画像でよく使うプロンプト要素を、小さなプリセットノードとして作れるようにすることです。



ノード
役割




Kawaii Outfit Preset
服装、色、季節感、素材、アクセサリ、スタイリングトーンを作る


Kawaii Hairstyle Preset
髪の長さ、髪型、前髪、髪色、質感、髪飾りを作る


Kawaii Character Identity Preset
年齢感、性格、役割、存在感を作る


Kawaii Face Expression Pose
表情、視線、ポーズ、手の位置、ムードを作る


Kawaii Body Preset
体型、姿勢、肌や体のディテールを作る


Kawaii Scene Composition
背景、時間帯、構図、カメラ距離、ライティングを作る


Kawaii Camera Framing Adjust
レンズ、フレーミング、向き、被写界深度、フォーカスを調整する


Kawaii Quality Style Preset
レンダリング品質、スタイル、質感、仕上げを追加する


Kawaii Color Palette Preset
カラーパレット、色の調和、アクセントカラーを作る


Kawaii Prompt Combine
複数のプロンプト部品をまとめる



ほかにも、ネガティブプロンプト用の Kawaii Negative Prompt Preset、プロンプト整形用の Kawaii Prompt Cleaner、候補切り替え用の Kawaii Prompt Switch を入れています。

 なぜプロンプトをノード化したのか
画像生成のプロンプトは、短いうちは1本の文章で管理できます。
たとえば、次のような指定です。
a cute young woman, long soft wavy hair, pink frilly blouse,
gentle smile, cherry blossom park, golden hour, soft diffused lighting
ただ、実際のワークフローではここに、ポーズ、カメラ、背景小物、季節感、画質指定、ネガティブプロンプトなどが加わります。
すると、1本のプロンプト欄の中で「どの部分が髪型なのか」「どの部分が背景なのか」「どの部分が品質指定なのか」が見えにくくなります。
KawaiiNodesでは、プロンプトを次のような単位に分けます。
服装
髪型
キャラクター性
表情とポーズ
体型や姿勢
背景と構図
カメラ指定
品質とスタイル
色の方向性
この形にしておくと、背景だけ差し替える、カメラだけ弱める、服装だけ固定して別シーンを試す、といった操作がやりやすくなります。
ComfyUIのノードグラフは、こういう「要素ごとの分解」と相性がいいです。テキスト編集というより、プロンプトの部品を配線していく感覚に近くなります。

 Z-Image Turbo向けに意識したこと
KawaiiNodesは、Z-Image Turboで使うことを意識して作りました。
Z-Image Turboは、単語を詰め込んだタグ列よりも、意味が通る自然な英語プロンプトと相性がよいと感じています。そのため、KawaiiNodesの各プリセットは、できるだけ読みやすい英語のフレーズを返すようにしています。
中心になるのは Kawaii Prompt Combine です。
このノードは、base_prompt と最大20個の prompt_part_* を受け取り、2種類の文字列を出力します。
positive_prompt
llm_prompt (-> TextGenerate)
positive_prompt は、そのまま CLIPTextEncode.text に渡すための出力です。プリセットから来た断片を結合し、Z-Image Turbo向けの品質指定も含めます。
llm_prompt (-> TextGenerate) は、ComfyUIの TextGenerate ノードに渡すための指示文です。プリセットで作った断片を、ローカルLLMに自然な1本の英語プロンプトへ書き直してもらう用途を想定しています。
KawaiiNodes自体はLLMを直接呼び出しません。ComfyUI環境ごとにTextGenerate系ノードやモデル構成が違うため、そこは既存のComfyUI側の仕組みに任せています。

 基本的なつなぎ方
一番シンプルなのは、プリセットノードを Kawaii Prompt Combine に集めて、その positive_prompt をそのまま使う形です。
Kawaii Outfit Preset
Kawaii Hairstyle Preset
Kawaii Character Identity Preset
Kawaii Face Expression Pose
Kawaii Scene Composition
Kawaii Camera Framing Adjust
Kawaii Quality Style Preset
Kawaii Color Palette Preset
  -> Kawaii Prompt Combine
  -> CLIPTextEncode.text
ネガティブプロンプトは別系統でつなぎます。
Kawaii Negative Prompt Preset.negative_prompt
  -> negative CLIPTextEncode.text
LLMを挟む場合は、positive_prompt ではなく llm_prompt (-> TextGenerate) を使います。
Kawaii Prompt Combine.llm_prompt (-> TextGenerate)
  -> TextGenerate.prompt

TextGenerate.generated_text
  -> CLIPTextEncode.text
この場合、最終的なconditioning chainには TextGenerate.generated_text だけをつなぎます。positive_prompt も同時に混ぜると、同じ指定が重複しやすくなります。
推奨する TextGenerate の設定は、READMEでは次のようにしています。
max_length: 384-512
sampling_mode: on
temperature: 0.55-0.7
top_p: 0.9
プリセットを多めに積んだ場合、短い max_length だと途中で文章が切れることがあります。細かい指定を入れるなら、少し長めにしておくと安定します。

 便利だった補助ノード
作っていて便利だったのが、プロンプト本体以外の補助ノードです。

 Kawaii Prompt Cleaner
Kawaii Prompt Cleaner は、入力されたプロンプト文字列を整えるノードです。
できることは、ラベルの削除、Markdown風の装飾除去、空白や句読点の正規化、重複したカンマ区切りフレーズの削除、最後のピリオド補完などです。
LLMを挟むと、出力に Prompt: のようなラベルや説明文が混ざることがあります。そういうときに、TextGenerate.generated_text の後ろへ置いておくと扱いやすくなります。
TextGenerate.generated_text
  -> Kawaii Prompt Cleaner.prompt
  -> CLIPTextEncode.text
直接パスでも、Kawaii Prompt Combine.positive_prompt の後ろに置けます。

 Kawaii Prompt Switch
Kawaii Prompt Switch は、最大10個の入力から1つを選ぶノードです。
たとえば、1つのワークフローの中に複数のテーマ案を置いておき、selected_index だけで切り替えるような使い方ができます。
theme_prompt_1
theme_prompt_2
theme_prompt_3
  -> Kawaii Prompt Switch
  -> Kawaii Prompt Combine.prompt_part_*
毎回ノードをつなぎ直さずにA/Bテストできるので、キャラクター案や背景案を比べるときに便利です。

 Character Consistency、Prop、Weather、Color Palette
Kawaii Character Consistency Preset は、髪、目、顔の印象、特徴的なアクセサリなど、シリーズ生成で固定したい要素をまとめるためのノードです。
Kawaii Prop Item Preset は、手に持つ小物や背景小物、キャラクターとアイテムの関係を足すために使います。
Kawaii Weather Atmosphere Preset は、天気、空気感、季節のムード、環境の動きを追加します。
Kawaii Color Palette Preset は、全体の色の方向性やアクセントカラーを決めるためのノードです。custom を選ぶと、独自のパレットやアクセントも入れられます。
これらを分けておくと、「同じキャラクターで雨の日だけ試す」「同じ構図で色だけ変える」といったバリエーション作りがしやすくなります。

 生成例
kawaii_z_image_turbo_recommended_beautiful_girl.workflow.json をベースにした生成例です。
同じ方向性のプリセットでも、小物、表情、構図、手の位置を変えると、かなり違う雰囲気になります。プロンプトをノード単位で分けておくと、この差し替えがしやすくなります。





 サンプルワークフロー
サンプルワークフローは3つ入れています。
sample_workflows/kawaii_prompt_builder.workflow.json
sample_workflows/kawaii_z_image_turbo_full.workflow.json
sample_workflows/kawaii_z_image_turbo_recommended_beautiful_girl.workflow.json
kawaii_prompt_builder.workflow.json は、KawaiiNodesのプロンプト構築部分だけを試すためのサンプルです。既存のZ-Image Turboワークフローへ組み込む前に、各プリセットの出力を確認する用途に向いています。
kawaii_z_image_turbo_full.workflow.json は、Z-Image Turboの画像生成まで含めたフルサンプルです。
kawaii_z_image_turbo_recommended_beautiful_girl.workflow.json は、あらかじめ推奨設定を入れたポートレート向けのサンプルです。拡張したプロンプトビルダー、Kawaii Prompt Cleaner、Kawaii Negative Prompt Preset を含めています。
フルサンプルでは、次のモデルファイルを想定しています。
ComfyUI/models/text_encoders/qwen_3_4b.safetensors
ComfyUI/models/diffusion_models/z_image_turbo_bf16.safetensors
ComfyUI/models/vae/ae.safetensors
ローカル環境でファイル名や配置を変えている場合は、ComfyUI側のローダーノードを調整してください。

 実装メモ
ComfyUIのPythonカスタムノードとしては、構成はかなりシンプルです。
__init__.py では、ノード定義ファイルから NODE_CLASS_MAPPINGS と NODE_DISPLAY_NAME_MAPPINGS をエクスポートしています。

__init__.py
from .kawaii_nodes import NODE_CLASS_MAPPINGS, NODE_DISPLAY_NAME_MAPPINGS

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS"]

各ノードはPythonクラスとして定義し、INPUT_TYPES、RETURN_TYPES、FUNCTION、CATEGORY を持たせています。
KawaiiNodesでは、基本的に入出力を STRING に寄せています。
理由は、ComfyUIのいろいろなテキスト系ノードとつなぎやすくしたかったからです。プリセットノードは特別な独自型ではなく、普通の文字列を返します。そのため、Kawaii Prompt Combine だけでなく、別の文字列処理ノードやTextGenerate系ノードにも接続しやすくなります。
また、多くの選択肢には none を入れています。
これは、あるノードですでに色やライティングを指定している場合、別ノード側ではその項目を空にできるようにするためです。プロンプトは足し算しすぎると衝突しやすいので、「指定しない」選択肢を明示的に持たせることはかなり大事でした。

 まとめ
KawaiiNodesは、Z-Image Turbo向けのかわいい系プロンプトを、ComfyUI上で部品化するためのカスタムノードパックです。
作っていて一番よかったのは、プロンプトの試行錯誤単位が小さくなったことです。
1本の長いプロンプトを直接編集するのではなく、服装、髪型、表情、背景、カメラ、品質、色をそれぞれ別ノードとして扱えます。
さらに、Kawaii Prompt Combine の直接出力を使うことも、TextGenerate に渡して自然な英語プロンプトへ整えることもできます。
ComfyUIでかわいい系の画像をよく作る人や、Z-Image Turbo向けのプロンプトをもう少し管理しやすくしたい人には、こういうノード分解の形はかなり相性がよいと思います。
まだ開発中なので細部は変わる可能性がありますが、ノード構成とサンプルワークフローがまとまったら、GitHubで公開する予定です。
