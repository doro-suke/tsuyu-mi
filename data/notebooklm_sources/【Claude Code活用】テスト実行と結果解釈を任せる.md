# 【Claude Code活用】テスト実行と結果解釈を任せる
- **Source URL**: https://zenn.dev/pekopugu/articles/agent01-b5-test-execution
- **Score**: 82
- **AI Summary**:
  - Claude Codeにテストを実行させ完了条件を自律判定させる具体的な指示方法を解説
  - Windowsの文字エンコードエラーを自動検出し修正させた具体的なトラブル事例を提示
  - CLAUDE.mdにルールを記述し動作確認から自動コミットまでを完結させる運用を提案
- **Read Now Reason**: AI駆動開発におけるClaude Codeの自律性を高めるための「完了条件」の記述テンプレートや「CLAUDE.md」の具体的な記述例が示されており、自動化パイプラインの品質向上に直結するため。
- **Suggested Tags**: #Claude-Code, #AI駆動開発, #テスト自動化, #LLMエージェント
- **Processed Date**: 2026/6/20

---

## 本文
Claude Code のコマンド実行能力
Claude Code は bash ツールを使ってターミナルコマンドを直接実行できます。実行結果を読んで「成功か失敗か」「次に何をすべきか」を自ら判断し、エラーが出た場合は原因を調べて修正まで行います。
この「実行 → 解釈 → 修正」サイクルを自律的に回せることが、単なるコード生成ツールとの大きな違いです。

 実際に任せてみた：動作確認スクリプトの実行
agent01 の各 Step には動作確認スクリプトが用意されています。例えば Step 08 の show_diff 実装後は以下のスクリプトを実行して完了条件を確認しました。

src/step08_diff.py
def test_show_diff_direct() -> None:
    """show_diff の単体テスト（LLM不使用）。"""
    print("=" * 50)
    print("[単体テスト] show_diff")
    print("=" * 50)

    # テスト1：通常の差分
    original = """def greet(name):
    print("hello " + name)
    return None
"""
    modified = """def greet(name: str) -> str:
    message = f"hello {name}"
    print(message)
    return message
"""
    result = show_diff(original, modified, "greet.py")
    print("[テスト1] 通常の差分")
    print(result)

Claude Code は python src/step08_diff.py を実行し、出力を見て「差分が正しく表示されているか」「テスト1〜3がすべてパスしているか」を判断しました。

 完了条件の書き方
実装指示書には「完了条件」チェックリストを設けていました。Claude Code はこのチェックリストを参照しながら自己確認を行います。
## 完了条件

- [ ] `python src/step08_diff.py` を実行してエラーなく完了する
- [ ] テスト1（通常の差分）でunified diff形式の出力が得られる
- [ ] テスト2（差分なし）で「差分はありません」と出力される
- [ ] テスト3（全削除）で削除行が `-` で表示される
「動作確認スクリプトを実行して完了条件のチェックリストを確認してください」という指示だけで、Claude Code が実行・確認・報告まで一連の作業を行いました。

 Windows 環境でのトラブルシューティング事例
Step 01 の実装中に、Claude Code が自力でエンコーディング問題を発見・修正した場面がありました。
発生した問題：
UnicodeEncodeError: 'cp932' codec can't encode character '✅'
Windows のデフォルトエンコーディングは cp932（Shift_JIS）であるため、UTF-8 の絵文字（✅ など）を標準出力に出力しようとするとエラーが発生しました。
Claude Code による修正：
エラーメッセージを読んだ Claude Code は、各スクリプトの先頭に以下の行を自動で追加しました。

src/agent.py
import sys
sys.stdout.reconfigure(encoding="utf-8")
sys.stdin.reconfigure(encoding="utf-8")

エラー原因の特定・修正コードの生成・動作確認まで、一連の作業をすべて自律的に行いました。
CLAUDE.md には「動作確認済みのものだけコミット」というルールを記載していました。これにより Claude Code は修正後に再度スクリプトを実行して問題が解消したことを確認してからコミットする行動を取りました。

 気づき
テスト駆動に近い開発サイクルが自然に回った：実装指示書に完了条件を明記しておくことで、Claude Code が自発的に動作確認を行う流れが生まれました。これにより「実装 → テスト → コミット」のサイクルが人の介在なしに完結することが増えました。
エラーメッセージがそのまま修正のヒントになる：Claude Code はエラーメッセージを丁寧に読んで原因を特定します。「cp932 で encode できない」というメッセージから encoding の問題を即座に理解したように、エラーメッセージが豊富なほど自律修正の精度が上がります。

 まとめ
Claude Code は実装後のテスト実行と結果解釈を自律的に行います。実装指示書に完了条件チェックリストを設けておくことで、「動作確認済み」という確証を持ってコミットに進める運用が実現しました。エラーが出ても自力で修正まで行うため、人間の介入が最小限で済みます。

 次回
B6 では、複数ファイルをまたぐ変更を Claude Code に任せた体験を紹介します。ツール追加時に3〜4ファイルを同時に正確に更新した事例をお伝えします。

 シリーズリンク（Series B）



記事
タイトル




B1
Claude Codeとは・導入と初期設定


B2
ファイル読み書きを任せる


B3
コードベース探索を任せる


B4
差分確認・適用を任せる


B5
テスト実行と結果解釈を任せる（本記事）


B6
複数ファイル跨ぎの修正を任せる


B7
PROGRESS.md駆動開発


B8
Zenn記事をClaude Codeに書かせる
