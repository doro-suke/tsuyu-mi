# 「WAI-illustrious-SDXL」をつかってみた。v16｜takeshi
- **Source URL**: https://note.com/takeshi3868/n/nff7afee4fbe9
- **Score**: 25
- **AI Summary**:
  - 画像生成モデルWAI-illustrious-SDXL v16の推奨設定（CFG、サンプラー、Hires等）を詳述
  - v15との生成比較および、複数サンプラーにおける指の描写精度や描写の差異を検証
  - 内蔵VAEの仕様や、ネガティブプロンプトで制御できないテキスト混入などの実用上の課題を報告
- **Read Now Reason**: 画像生成AIを利用したプロダクトを開発中で、SDXL系モデルの具体的な推奨パラメータやサンプラー特性を即座に把握したい場合にのみ有効です。
- **Suggested Tags**: #Stable Diffusion, #SDXL, #AIイラスト, #モデル検証
- **Processed Date**: 2026/5/13

---

## 本文
Aiモデル「WAI-illustrious-SDXL v16」を使ってみました。（civitai公開　2025.12.18 v16 ← 2025.09.01 v15）出てから記事現在3か月近く経ってますが、やはり人気のあるモデルでcivitaiダウンロードが1万を超えている状況ですv16の特徴として「モデル全体のデフォルトスタイルを調整し視覚的なクリーンさとキャラクターの正確さを向上した」とのこと。適当に使ってみました。〇推奨設定（civitai掲載）CFG:　5～7Sampler:　 Euler aSteps:　15～30Hires upscale: 1.5, steps: 20, upscaler: R-ESRGAN 4x+ Anime6BDenoising strength: 0.35～0.5size: 1024*1024以上セイフティータグは「general, sensitive, nsfw,explicit」の４つ。不適切な内容のフィルタリングでnegative prompに「nsfw」を入れてねとのこと。～,masterpiece,best quality,amazing quality,推奨　Positive Promptbad quality,worst quality,worst detail,sketch,censor,～推奨　Negative Prompt「VAEは内蔵してるからそんなこと聞くんじゃない」的なことが作者さんが言っています。毎回しつこく聞かれてるんでしょう・・・〇生成してみたv15の見本画を参考にv15の参考画をそのままv16で生成。もう１つ。小指が立ってる…気づいた方もいるかもしれませんが、２つとも下にうっすらと文字が入ってます…いらない。negにtext入れても消えない模様余談１　他サンプラーで生成比較推奨Sampler「Euler a」ですが、その他５つ含め試しました。変な描写だけEuler a：指Euler：指、椅子、ショルダーバッグDPM++2M：指DPM++SDE：椅子DPM++2M SDE：指DPM++3M SDE：指全体的に指の描写がきつそう。他はガチャすればどうにでもなりそう。推奨Sampler以外でも作れないこともないかと余談２　v15と比較生成モデル以外同条件で生成。・・・。個人的にどっちもどっち。しゃがみを追加。個人的に左が好みです明確に「こっちが良い」とは言えません。好みの問題だと思います。➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖元々がイラスト調として出来上がっているモデルなのでアプデは多少の差なのかもしれません。コメント欄にやたらZ-imgにも反映させたいのかしつこく書込みあります。入ればかなり良いモノになるのは間違いない。個人的にFlux2+Wai入れてもらうと最高じゃないかと思います（NSFWが入る入らないに関係なく）↓↓以前にv15について書いた記事↓↓みなさんも適当に使ってみてください。いいね！してもらう嬉しいです。
