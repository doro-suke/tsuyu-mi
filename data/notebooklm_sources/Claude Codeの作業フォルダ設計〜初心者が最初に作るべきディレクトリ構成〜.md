# Claude Codeの作業フォルダ設計〜初心者が最初に作るべきディレクトリ構成〜
- **Source URL**: https://newspicks.com/news/16789148/body/
- **Score**: 50
- **AI Summary**:
  - Claude Codeの出力を安定させる推奨フォルダ構成（inbox、reference等）を提示
  - .claude/フォルダ内にプログラミング用の設定やskillsを配置することを推奨
  - 記事作成や議事録、調査など業務用途に応じたディレクトリ構成の具体例を紹介
- **Read Now Reason**: Claude Codeを活用したAI駆動開発において、エージェントのコンテキスト理解を助ける作業ディレクトリ設計の基本概念を把握できるため。
- **Suggested Tags**: #Claude Code, #AI駆動開発, #環境構築
- **Processed Date**: 2026/6/8

---

## 本文
Claude Code初心者が最初に作るべきものは、プロンプトではありません。


    作業フォルダです。


    Claude Codeは、ファイルを読み、編集し、保存します。


    だから、作業場が散らかっていると、出力も散らかります。


    この記事では、初心者が最初に作るべきディレクトリ構成をまとめます。


    
            
                この記事が、NewsPicksの【総合トップ】【テクノロジー】で紹介され、話題になっています🎉
            
            
        



            
                作業フォルダがないとClaude Codeは迷う
最小構成
inbox
reference
draft
output
archive
.claude
仕事別の応用
今日作るチェックリスト
            


    見出し画像はAIで生成しました。プロンプトは80000文字超えの記事に掲載中。

            



    
    
    


    Claude Codeは、チャットAIではありません。


    作業フォルダの中で動くAIです。


    素材、参考資料、下書き、完成物が同じ場所にあると、何を読めばいいか、何を保存すればいいかが曖昧になります。


    最初に棚を作るだけで、かなり使いやすくなります。




    
    
    


    初心者は、この形で始めてください。


    
    
    


    これだけで十分です。




    
    
    


    `inbox/`は、未整理の素材を入れる場所です。


    文字起こし、メモ、URL一覧、画像メモ、思いつきなどを入れます。


    まだ使うか分からない素材は、全部ここで問題ありません。




    
    
    


    `reference/`は、Claude Codeに参照してほしい情報を置く場所です。


    たとえば、次のようなものです。

            
                読者ペルソナ
タイトル候補
過去記事
ブランドルール
参考リンク
            

    出力の質は、参照素材で変わります。




    
    
    


    `draft/`は、下書きを置く場所です。


    記事案、構成案、途中のメモ、確認前の出力を置きます。


    完成物と混ぜないことが大事です。




    
    
    


    `output/`は、完成物を置く場所です。


    note本文、投稿文、提案書、チェックリストなど、使える状態のものだけを置きます。


    Claude Codeへは「完成物はoutputへ保存」と伝えます。




    
    
    


    `archive/`は、使い終わったものを置く場所です。


    削除ではなく移動です。


    初心者は、最初から削除運用をしない方が安全です。


    不要な素材は`archive/`へ移します。




    
    
    


    `.claude/`は、Claude Code用の設定やskillsを置く場所です。


    
    
    


    プロジェクトごとに使うskillsは、ここへ置きます。




    
    
    


    note記事なら、こうです。

            
                reference/title.md
reference/reader.md
draft/agenda.md
output/index.md
            

    議事録なら、こうです。

            
                inbox/transcript.md
draft/summary.md
output/minutes.md
            

    調査なら、こうです。

            
                reference/source-list.md
draft/research-notes.md
output/brief.md
            

    フォルダ構成は、仕事に合わせて増やして構いません。


    ただし、最初は増やしすぎないでください。




    
    
    


    今日作るのは、これだけです。

            
                `claude-work/`
`CLAUDE.md`
`inbox/`
`reference/`
`draft/`
`output/`
`archive/`
`.claude/skills/`
            

    Claude Codeは、作業場が整うほど使いやすくなります。


    プロンプトを磨く前に、まずフォルダを作ってください。



    🔽 AI推進担当になったら読む記事

            

    🔽 個別相談はこちら

            

    🔽 グループコンサル

            

    🔽 法人研修の無料相談・お問い合わせこちら

            

    🔽 800本以上の記事が読み放題のnoteメンバーシップ

            

    🔽 書籍「AIでゼロからデザイン」好評発売中

            
※本記事はNewsPicksによって制作されたものではなく、内容の一切の責任はトピックスの発信者であるオーナーが負っています。内容に誤りや不適切な表現がある場合は、報告フォームからご報告ください。
