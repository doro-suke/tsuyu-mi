# ようやく CLAUDE.md が不要になった
- **Source URL**: https://zenn.dev/tenkei/articles/bad7b682aed22c
- **Score**: 82
- **Suggested Tags**: #ClaudeCode, #AI駆動開発, #AGENTS.md
- **Processed Date**: 2026/10/4

---

## 本文
概要
Claude Code が AGENTS.md を読めるようになった。
v2.1.277（2026/09/18リリース）から対応。
デフォルトの挙動は「プロジェクトに CLAUDE.md がなければ AGENTS.md を読む」。
つまり、AGENTS.md だけ置いておけば、Claude Code でも指示が効く。CLAUDE.md はもう要らない。
自分は ClaudeCode と Codex を併用している。指示ファイルを1つにまとめられるのは、地味にありがたい。

 これまでの困りごと
Codex や Cursor などは AGENTS.md を読む。でも Claude Code は CLAUDE.md しか読まなかった。
なので、これまではこんな回避策を取っていた。


ln -s AGENTS.md CLAUDE.md でシンボリックリンクを張る
CLAUDE.md に @AGENTS.md とだけ書く

小さいリポジトリならこれで十分。
でもモノレポでディレクトリごとに指示ファイルがあると、CLAUDE.md を各階層に用意するのが面倒になる。Windows だとシンボリックリンクも一手間かかる。

 何が変わったのか
この対応は、Claude Code 本体に処理を差し込む「mod」というプラグインの仕組みで実装されている。
ソースは anthropics/claude-code の mods/agents-md に公開されている。
読み込まれた AGENTS.md は、CLAUDE.md と同じ扱いになる。コンテキスト内の位置も、渡され方も同じだ。

 instructionFiles の4つの値
/config の「Project instructions」から選べる。設定項目名は instructionFiles。



値
挙動




claude-md
CLAUDE.md だけ読む（従来どおり。mod は何もしない）



claude-md-or-agents-md（デフォルト）
プロジェクト自身の指示ファイルがなければ、AGENTS.md 群を CLAUDE.md と同じ場所・同じ扱いで読み込む


claude-md-and-agents-md
ツリー上のすべての AGENTS.md を、CLAUDE.md と併せて読み込む


managed-only
プロジェクトの指示ファイルと個人の指示ファイルを外し、組織が管理する CLAUDE.md だけを使う



claude-md-or-agents-md での「プロジェクト自身の指示ファイル」とは、ルートから作業ディレクトリまでのどこかにある CLAUDE.md・.claude/CLAUDE.md・CLAUDE.local.md を指す。これが1つでもあれば、その時点で AGENTS.md は一切読まれない。逆に、組織が管理する CLAUDE.md や ~/.claude/CLAUDE.md などはここでいう「自身の指示ファイル」に含まれないので、これらがあっても AGENTS.md へのフォールバックは起きる。
設定は ~/.claude/settings.json などに直接書くこともできる。
{
  "pluginConfigs": {
    "agents-md@builtin": {
      "options": { "instructionFiles": "claude-md-and-agents-md" }
    }
  }
}
/plugin からこの mod 自体をオフにすることもできる。オフにすると、Claude Code は CLAUDE.md だけを読む従来の挙動に戻る。

 CLAUDE.md とまったく同じではない
AGENTS.md は CLAUDE.md と同じ場所に差し込まれるが、mod がフックできるイベントの都合上、いくつか届かない範囲がある。README に挙がっている差分のうち、実用上気になりそうなものを挙げる。


サブディレクトリの AGENTS.md は、テキストファイルを Read したときだけ読み込まれる。 CLAUDE.md であれば、プロンプト内で @ メンションしたときや、IDEで開いているファイル、Read toolのnotebook/image/PDFの結果に対しても、そのディレクトリの CLAUDE.md が読み込まれる。AGENTS.md はこれらのケースでは読み込まれない

--add-dir で追加したディレクトリには、CLAUDE.md なら読み込まれるが、AGENTS.md は読み込まれない

/memory コマンドや # ショートカットは AGENTS.md を認識しない
サブディレクトリで読み込んだ AGENTS.md は、圧縮（コンパクション）後に「最近読んだファイル」として復元されない。該当ディレクトリを次に Read したタイミングで、また読み込み直される

要するに、ルート直下に置く指示ファイルとしてはほぼ CLAUDE.md と同等に使えるが、ネストした AGENTS.md を多用する構成では、CLAUDE.md ほど手厚くは拾われない。

 移行するには
CLAUDE.md がすでにあるなら、AGENTS.md にリネームして CLAUDE.md をなくせばいい。
git mv CLAUDE.md AGENTS.md
Claude Code のバージョンが 2.1.277 以上であることは確認しておく。

 まとめ

Claude Code が AGENTS.md を読むようになった（v2.1.277〜）
デフォルト（claude-md-or-agents-md）では、CLAUDE.md がなければ AGENTS.md が使われる
CLAUDE.md も残したいなら claude-md-and-agents-md で両方読める
複数のAIを併用しているなら、AGENTS.md に一本化できる
ただし、ネストした AGENTS.md の拾われ方は CLAUDE.md ほど手厚くない点に注意


 参考
