# DevContainerより軽量？Devboxで開発環境を瞬時に作る
- **Source URL**: https://zenn.dev/arkbig/articles/devbox_0b6b39cd097e3288fe58baa5a49c7d39a28c5b46849
- **Score**: 55
- **AI Summary**:
  - Nixベースの環境構築ツールDevboxを用いて、Dockerより軽量かつ高速に開発環境を作る手法を解説
  - root権限がない環境やVS Code Remote SSHに対応するための、具体的なシェル設定スクリプトを提示
  - devbox initとdirenvの連携により、プロジェクトごとにPATHやツール群を自動的に切り替える手順を明記
- **Read Now Reason**: プロジェクトメンバー間の開発環境を統一・軽量化する自動化アプローチとして有用であり、VS Code Remote SSH利用時の具体的なバグ回避策がシェルスクリプト付きで提示されているため。
- **Suggested Tags**: #Devbox, #Nix, #開発環境構築, #direnv
- **Processed Date**: 2026/5/27

---

## 本文
DevContainer便利ですよね。開発環境をプロジェクトごとに簡単に構築できるし、環境の差異による問題も減ります。
ただ、Dockerベースで若干オーバーヘッドがあったり、VS Code基準になっているのが気になることもあります。
デキる開発者はVimやEmacsで完結させたい人もいるでしょうし、Dockerを使わない軽量な環境構築ができるとうれしいですよね。（NeovimやEmacsでもDevContainerサポートされてきているようですが）
そこで、JetifyのDevboxを試してみました！DevboxはNix（パッケージ管理 & システム構成）をベースにした開発環境構築ツールで、Dockerよりも軽量で高速な環境構築が可能です。



 さくっとセットアップだけしたい人向け（折りたたみを展開）
さくっとセットアップだけしたい人向け（ここをクリックで展開）。

 1. Nixのインストール
# sudoが使えない場合は、nix-user-chrootを使用してインストールします。
# その場合の代替ディレクトリを指定します。（マシン間共有されるNFSだとパフォーマンスに影響するので避ける）
NIX_USER_STORE_DIR=${NIX_USER_STORE_DIR:-$HOME/.nix}

# 1. Nixのインストール
if sudo -v >/dev/null 2>&1; then
    # root権限があるのでサクッとインストール
    sh <(curl --proto '=https' --tlsv1.2 -L https://nixos.org/nix/install) --no-daemon
else
    # root権限がないのでnix-user-chrootを使ってインストール
    if unshare --user --pid echo YES >/dev/null 2>&1; then
        mkdir -p ~/.local/bin
        nix_user_chroot_version=$(curl -s https://api.github.com/repos/nix-community/nix-user-chroot/releases/latest | grep '"tag_name":' | sed -E 's/.*"tag_name": "([^"]+)".*/\1/')
        curl -fsSL https://github.com/nix-community/nix-user-chroot/releases/download/${nix_user_chroot_version}/nix-user-chroot-bin-${nix_user_chroot_version}-$(uname -m)-unknown-linux-musl -o ~/.local/bin/nix-user-chroot
        chmod +x ~/.local/bin/nix-user-chroot
    else
        # user namespacesが有効になっていない場合はインストールできない
        echo "Error: user namespaces are not enabled. Please enable them to install Nix without root privileges."
        exit 1
    fi
    # nix-user-chrootを実行して、Nixをインストール
    mkdir -p -m 0755 $NIX_USER_STORE_DIR
    ~/.local/bin/nix-user-chroot $NIX_USER_STORE_DIR bash -c "curl -fsSL https://nixos.org/nix/install | sh -s -- --no-daemon"
    # 以降の処理用にnix-user-chrootを実行した環境に入る
    ~/.local/bin/nix-user-chroot $NIX_USER_STORE_DIR bash
fi


 2. Devboxのインストール & 3. Direnvのインストール
# 2. Devboxのインストール
nix profile add nixpkgs#devbox --extra-experimental-features "nix-command flakes"

# 3. Direnvのインストール
devbox global add direnv@2.37.1


 4. シェルの初期化ファイルの設定

.profile
# if running bash
if [ -n "$BASH_VERSION" ]; then
    # include .bashrc if it exists
    if [ -f "$HOME/.bashrc" ]; then
	. "$HOME/.bashrc"
    fi
fi

# VS Code Remote SSH対策
# .bashrcでも~/.local/binにPATHを通すようにしているので重複回避する
if ! type prepend_to_path_env >/dev/null 2>&1 ; then
    # .bashrcで登録してなければ、重複気にしないでPATHに追加する
    prepend_to_path_env() {
        if [ -d "$1" ] ; then
            PATH="$1:$PATH"
        fi
    }
fi

# set PATH so it includes user's private bin if it exists
prepend_to_path_env "$HOME/.local/bin"

# ↓ VS Code Remote SSH対策で.bashrcにも追加するので、二重呼び出しを回避
if [ -z "${NIX_SH_SOURCED:-}" ] ; then
# ↓ nix.sh呼び出しはNixインストール時に追加される
if [ -e "$HOME/.nix-profile/etc/profile.d/nix.sh" ]; then . "$HOME/.nix-profile/etc/profile.d/nix.sh"; fi # added by Nix installer
fi



.bashrc
# VS CodeのRemote SSH用サーバー起動が非対話シェルで行われる。
# そのため、対話シェルでない場合も起動するよう先頭に記載

# nix-user-chrootを使用している場合、起動のたびに実行する必要がある
NIX_USER_CHROOT_BIN="$HOME/.local/bin/nix-user-chroot"
# ホームディレクトリがNFSの場合、ローカルディスクのパスに書き換えないと遅い
NIX_USER_STORE_DIR="$HOME/.nix"
if [ -z "$IN_NIX_CHROOT" ] && [ -x "$NIX_USER_CHROOT_BIN" ]; then
    export IN_NIX_CHROOT=1
    mkdir -p -m 0755 "$NIX_USER_STORE_DIR"

    # Linuxの /proc/$$/cmdline から元のbash起動引数を完全に復元する
    if [ -f /proc/$$/cmdline ]; then
        unset ARGS
        while IFS= read -r -d '' line; do
            ARGS+=("$line")
        done < /proc/$$/cmdline

        # 引数が2つ以上ある場合（例: -c "ls" や VS Codeの自動起動スクリプトなど）
        if [ ${#ARGS[@]} -gt 1 ]; then
            # ARGS[0]は親プロセス名(bash)なので、1番目以降の引数（${ARGS[@]:1}）
            # をそのまま引き継ぐ
            exec "$NIX_USER_CHROOT_BIN" "$NIX_USER_STORE_DIR" "$BASH" "${ARGS[@]:1}"
        fi
    fi

    # 通常の対話型ログイン（引数なし）や、標準入力からのスクリプト流し込みの場合
    exec "$NIX_USER_CHROOT_BIN" "$NIX_USER_STORE_DIR" "$BASH" "$@"
fi

# VS Code Remote SSH対策
# .profileのPATH設定がリセットされる問題を回避するためのコード
prepend_to_path_env() {
    if [ -d "$1" ] ; then
        case ":$PATH:" in
            *:"$1":*)
                #すでにPATHに含まれている場合は何もしない
                ;;
            *)
                PATH="$1:$PATH"
                ;;
        esac
    fi
}
prepend_to_path_env "$HOME/.local/bin"

# 以降は非対話シェルでは実行しないようになっている。
# VS Code Remote SSH対策はこれより前に書く必要がある。

# If not running interactively, don't do anything
case $- in
    *i*) ;;
      *) return;;
esac

# :
# その他もろもろ
# :

# 1. Nixの設定（DevboxがNix環境のため最初に設定）
if [ -e "$HOME/.nix-profile/etc/profile.d/nix.sh" ] ; then
    . "$HOME/.nix-profile/etc/profile.d/nix.sh"
    NIX_SH_SOURCED=1
fi
# 2. Devboxのグローバルツールの設定（DirenvがDevbox環境のため先に設定）
if [ -x "$(command -v devbox)" ]; then
    eval "$(devbox global shellenv)"
fi
# 3. Direnvの設定
eval "$(direnv hook bash)"



 使い方
# devbox.jsonの用意
devbox init
# パッケージ追加
devbox add bun
# .envrcの用意
devbox gen direnv



 Devboxの特徴
Dockerがコンテナベースで環境を分離するのに対して、Devboxはもっとゆるくシェルの環境を分離します。
簡単にいうと、PATH環境変数をプロジェクトごとに切り替えるようなイメージです。環境変数設定ならDirenvでもできますが、Devboxはパッケージマネージャーとしても機能するので、プロジェクトごとに異なるバージョンのツールやライブラリを簡単に管理できます。
Devboxと同様に開発環境を構築できるツールとしては次のようなものがあるようです。（Gemini 3.5 Flash調べ）



ツール
特徴
メリット
デメリット
学習コスト




DevContainer CLI
VS Codeから独立したCLI版のDevContainer。
完全なカプセル化された環境を提供。
Dockerベースでオーバーヘッドがある。
低


Mise
Rust製の高速な複数言語・ツールマネージャー、タスクランナー、環境変数管理ツール。
DockerやNixが不要で非常に高速。ツールのバージョン管理からタスク実行まで1つで完結する。
OS層の共有ライブラリなどシステム依存関係の厳密な再現は難しい。
低


Devenv
Nixをベースにした、宣言的で部品を組み替え可能な開発環境構築ツール。
高い再現性に加え、プロセス管理（DB等の起動）、プレコミット、コンテナ生成まで強力に自動化できる。
Nixエコシステムへの依存度が高く、高度なカスタマイズにはNix言語の知識が求められる。
高


Flox
Nixを基盤とし、チーム共有やライフサイクル管理に最適化された環境・パッケージ管理ツール。
Nixの複雑さを隠蔽した直感的なCLI。環境のパブリッシュやチーム間での同期・配布が容易。
比較的新しいツールであり、機能の一部や管理機能がFlox独自のエコシステムに依存する。
中


Devbox
Nixをバックエンドに利用し、Nixの知識ゼロで決定論的な開発環境を構築できるツール。

devbox.jsonに書くだけで、Nixの強力な再現性を軽量かつ手軽に利用できる（Dockerより軽量）。
純粋なNix独自の高度なカスタマイズ（独自のNix式を用いたビルドなど）を行うには不向き。
低



厳密に分離する場合はDevContainer CLIがいいかもしれません。しかし、Miseを除くほかのNixベースのツールはコンテナイメージ作成をサポートしているので、必要になったらその機能を使うこともできます。
そして学習コストを考えると、Devboxが手軽に軽量な環境構築ができていいなと思い採用してみました。

 セットアップ手順
Devboxのセットアップは次の手順で行います。

ベースとなるNixの準備
メインのDevboxの準備
グローバルツールの準備
プロジェクトツールの準備

それでは、順番に説明していきます。

 1. ベースとなるNixの準備
DevboxはNixをバックエンドに利用しているため、まずはNixをシステムにインストールする必要があります。


 Nixのインストール（root権限がある場合）
Nixは/nixの固定パスを使用します。sudo権限があればそこにディレクトリを作ることができるので、次のコマンドでインストールできます。

シングルユーザーモードでのインストール：
sh <(curl --proto '=https' --tlsv1.2 -L https://nixos.org/nix/install) --no-daemon

 Nixのインストール（root権限がない場合）

非rootユーザーでsudoが使えないと/nixにディレクトリを作成できないため、user namespaces機能を使って別のディレクトリを/nixとしてマウントする方法でインストールします。

まず、user namespaces機能が有効になっているか確認します。
unshare --user --pid echo YES
# 上記コマンドで YES と表示されれば有効です。
GitHubのReleasesページから実行ファイルを~/.local/binにダウンロードします。
mkdir -p ~/.local/bin
nix_user_chroot_version=2.1.1
curl -fsSL https://github.com/nix-community/nix-user-chroot/releases/download/${nix_user_chroot_version}/nix-user-chroot-bin-${nix_user_chroot_version}-$(uname -m)-unknown-linux-musl -o ~/.local/bin/nix-user-chroot
chmod +x ~/.local/bin/nix-user-chroot
/nixディレクトリは多数のファイルアクセスが発生するため、NFS上ではパフォーマンスやロック競合の問題があるので避けるのが望ましいです。
nix-user-chrootを使用して、ユーザーディレクトリにシングルユーザーモードでNixをインストール：
# NFSだとパフォーマンスやロック競合があるので避ける
NIX_USER_STORE_DIR=~/.nix
mkdir -p -m 0755 $NIX_USER_STORE_DIR
# 以降のコマンドは、nix-user-chrootでユーザーディレクトリを/nixとしてマウントした環境で実行する必要があります。
nix-user-chroot $NIX_USER_STORE_DIR bash
curl -fsSL https://nixos.org/nix/install | sh -s -- --no-daemon
nix-user-chrootは起動のたびに実行する必要があるので、.bashrcに追記しておくといいです。あとでまとめて説明します。

 Nixのインストール後の確認
インストールが完了したら、次のコマンドでNixが正しくインストールされているか確認してみましょう。
which nix
# /home/big/.nix-profile/bin/nix
nix --version
# nix (Nix) 2.34.7

 2. メインのDevboxの準備
次にDevboxをインストールします。


 Devboxのインストール
せっかくなのでNixを使ってインストールしてみましょう。次のコマンドでインストールできます。
nix profile add nixpkgs#devbox --extra-experimental-features "nix-command flakes"
モダンな方式のprofileを使っていますが、こちらはまだ試験的な機能なので別途指定が必要です。

 Devboxのインストール後の確認
インストールが完了したら、次のコマンドでDevboxが正しくインストールされているか確認してみましょう。
which devbox
# /home/big/.nix-profile/bin/devbox
devbox version
# 0.17.2

 3. グローバルツールの準備
Devboxはプロジェクトごとに環境を切り替えることができますが、共通で使うツールはグローバルにインストールできます。そこで、ディレクトリ移動で自動的にDevbox環境が切り替わるように、direnvをグローバルにインストールしておきます。

 Direnvのインストール
Direnvはディレクトリ移動で入ったディレクトリに応じて環境変数を切り替える（スクリプトを実行する）ツールです。
この機能を使って、プロジェクトディレクトリに入ると自動的にDevbox環境を有効にしましょう。

devbox globalコマンドを使って、direnvをグローバルツールとしてインストールします。こうすることで、direnvがない別のマシン（NFSでホームディレクトリだけ共有されている場合）でも、Devboxがdirenvを自動でインストールしてくれます。
devbox global add direnv
# Warning: devbox global is not activated.
#
# Add the following line to your shell's rcfile and restart your shell:
#
# For bash/zsh (~/.bashrc or ~/.zshrc):
#         eval "$(devbox global shellenv)"
インストールは成功しますが、global機能を有効にするためDevbox用の設定が必要と警告がでます。Direnvの設定と合わせて後述します。

 Direnvのインストール後の確認
which direnv
# /home/big/.local/share/devbox/global/default/.devbox/nix/profile/default/bin/direnv
direnv --version
# 2.37.1

 .profile、.bashrcなどのシェルの初期化ファイルの設定

シェルの初期化ファイルに追記して、自動的にDevbox環境が有効になるよう設定します。ここでは主にUbuntu環境を想定しています。（Macマシン壊れたためzshの確認はしていません。）
また、VS CodeのRemote SSHで接続したときに、.profileのPATH設定がリセットされる問題を回避するためのコードも入れています。

.profile
# if running bash
if [ -n "$BASH_VERSION" ]; then
    # include .bashrc if it exists
    if [ -f "$HOME/.bashrc" ]; then
	. "$HOME/.bashrc"
    fi
fi

# VS Code Remote SSH対策
# .bashrcでも~/.local/binにPATHを通すようにしているので重複回避する
if ! type prepend_to_path_env >/dev/null 2>&1 ; then
    # .bashrcで登録してなければ、重複気にしないでPATHに追加する
    prepend_to_path_env() {
        if [ -d "$1" ] ; then
            PATH="$1:$PATH"
        fi
    }
fi

# set PATH so it includes user's private bin if it exists
prepend_to_path_env "$HOME/.local/bin"

# ↓ VS Code Remote SSH対策で.bashrcにも追加するので、二重呼び出しを回避
if [ -z "${NIX_SH_SOURCED:-}" ] ; then
# ↓ nix.sh呼び出しはNixインストール時に追加される
if [ -e "$HOME/.nix-profile/etc/profile.d/nix.sh" ]; then . "$HOME/.nix-profile/etc/profile.d/nix.sh"; fi # added by Nix installer
fi



.bashrc
# VS CodeのRemote SSH用サーバー起動が非対話シェルで行われる。
# そのため、対話シェルでない場合も起動するよう先頭に記載

# nix-user-chrootを使用している場合、起動のたびに実行する必要がある
NIX_USER_CHROOT_BIN="$HOME/.local/bin/nix-user-chroot"
# ホームディレクトリがNFSの場合、ローカルディスクのパスに書き換えないと遅い
NIX_USER_STORE_DIR="$HOME/.nix"
if [ -z "$IN_NIX_CHROOT" ] && [ -x "$NIX_USER_CHROOT_BIN" ]; then
    export IN_NIX_CHROOT=1
    mkdir -p -m 0755 "$NIX_USER_STORE_DIR"

    # Linuxの /proc/$$/cmdline から元のbash起動引数を完全に復元する
    if [ -f /proc/$$/cmdline ]; then
        ARGS=()
        while IFS= read -r -d '' line; do
            ARGS+=("$line")
        done < /proc/$$/cmdline

        # 引数が2つ以上ある場合（例: -c "ls" や VS Codeの自動起動スクリプトなど）
        if [ ${#ARGS[@]} -gt 1 ]; then
            # ARGS[0]は親プロセス名(bash)なので、1番目以降の引数（${ARGS[@]:1}）
            # をそのまま引き継ぐ
            exec "$NIX_USER_CHROOT_BIN" "$NIX_USER_STORE_DIR" "$BASH" "${ARGS[@]:1}"
        fi
    fi

    # 通常の対話型ログイン（引数なし）や、標準入力からのスクリプト流し込みの場合
    exec "$NIX_USER_CHROOT_BIN" "$NIX_USER_STORE_DIR" "$BASH" "$@"
fi

# VS Code Remote SSH対策
# .profileのPATH設定がリセットされる問題を回避するためのコード
prepend_to_path_env() {
    if [ -d "$1" ] ; then
        case ":$PATH:" in
            *:"$1":*)
                #すでにPATHに含まれている場合は何もしない
                ;;
            *)
                PATH="$1:$PATH"
                ;;
        esac
    fi
}
prepend_to_path_env "$HOME/.local/bin"

# 以降は非対話シェルでは実行しないようになっている。
# VS Code Remote SSH対策はこれより前に書く必要がある。

# If not running interactively, don't do anything
case $- in
    *i*) ;;
      *) return;;
esac

# :
# その他もろもろ
# :

# 1. Nixの設定（DevboxがNix環境のため最初に設定）
if [ -e "$HOME/.nix-profile/etc/profile.d/nix.sh" ] ; then
    . "$HOME/.nix-profile/etc/profile.d/nix.sh"
    NIX_SH_SOURCED=1
fi
# 2. Devboxのグローバルツールの設定（DirenvがDevbox環境のため先に設定）
if [ -x "$(command -v devbox)" ]; then
    eval "$(devbox global shellenv)"
fi
# 3. Direnvの設定
eval "$(direnv hook bash)"

VS CodeのRemote SSHを使用するとき、.profileのPATH設定がリセットされてVS Code用のPATHに書き換わってしまう問題があるようです。.bashrcに書いたものはリセットされないため、.profileのPATH設定を.bashrcでも行うようにして、重複回避のコードを入れています。
その際Remote SSH用のVS Codeサーバー起動時に、.bashrcの非対話シェルでの早期リターンに引っかからないよう、対話シェルチェックの前に書くものもあります。
各ツール用の設定は対話シェル用のものなので、末尾に書いています。
上記コードをまとめると、次のような構成になります。


.profileの内容


.bashrcで~/.local/binにPATHを通していれば、.profileでは重複登録しないようにする

.bashrcでnix.shを呼び出している場合、.profileでは重複実行しないようにする



.bashrcの非対話シェル用の内容（ファイル冒頭）

nix-user-chrootを使用している場合、起動のたびに実行する必要があるため、対話シェルでない場合も起動するようにする
VS Code Remote SSH用の対策コードで、~/.local/binにPATHを通すようにする（重複回避のコードも入れる）



.bashrcの対話シェル用の内容（ファイル末尾）

Nixの設定（DevboxがNix環境のため最初に設定）
Devboxのグローバルツールの設定（DirenvがDevbox環境のため先に設定）
Direnvの設定




 4. プロジェクトツールの準備
ここまでの設定で、プロジェクトディレクトリに入ると自動的にDevbox環境を有効にする準備が整いました。実際のプロジェクト用の設定を見てみましょう。
今回はこのZenn記事用のリポジトリを例にします。

JavaScriptのランタイムとしてBunを利用
zenn-cliやtextlintはbunを使ってインストール

この環境を最初から作りましょう。Let's go!
mkdir example-project
cd example-project

# devbox.jsonを作成
devbox init
# Created devbox.json in /home/big/proj/test
# Run `devbox add <package>` to add packages, or `devbox shell` to start a dev shell.

# ツール追加
devbox add bun@1.3.3 direnv@2.37.1
# Info: Adding package "bun@1.3.3" to devbox.json
# Info: Adding package "direnv@2.37.1" to devbox.json

# .envrcを作成
devbox gen direnv
# Info: Ensuring packages are installed.
# ✓ Computed the Devbox environment.
# Success: generated .envrc file in "".
# Success: ran `direnv allow `

# bunを使ってライブラリをインストール
bun add -d \
    @proofdict/textlint-rule-proofdict@3.1.2 \
    prettier@3.8.3 \
    prettier-plugin-md-nocjsp@1.5.1 \
    textlint@15.6.0 \
    textlint-filter-rule-allowlist@4.0.0 \
    textlint-rule-preset-ja-spacing@2.4.3 \
    textlint-rule-preset-ja-technical-writing@12.0.2 \
    textlint-rule-preset-smarthr@1.37.1 \
    textlint-rule-prh@6.1.0 \
    zenn-cli@0.4.6

# インストール確認
prettier --version
# 3.8.3
textlint --version
# v15.6.0
zenn --version
# 0.4.6
上記コマンドで環境の構築が完了しました。プロジェクトディレクトリに入ると自動的にDevbox環境が有効になり、prettierやtextlint、zennコマンドが利用できるようになっています。
もう少し設定を追記することで、Devbox環境を有効化したときに自動でbun installも走るようにできます。
devbox.jsonを次のように編集してみましょう。envで環境変数を設定し、shell.init_hookにDevbox環境が有効になったとき実行されるコマンドを指定できます。ここでbun installを走らせるようにしています。

devbox.json
{
  "$schema": "https://raw.githubusercontent.com/jetify-com/devbox/0.17.2/.schema/devbox.schema.json",
  "packages": [
    "bun@1.3.3"
  ],
  "env": {
    "PATH": "$PWD/node_modules/.bin:$PATH"
  },
  "shell": {
    "init_hook": [
      "if [ ! -d node_modules ] || [ ! -x node_modules/.bin/zenn ]; then bun install; fi"
    ]
  }
}

devbox.jsonにはほかに、env_fromで.envファイルから環境変数を引っ張ってきたり、shell.scriptsでaliasコマンドを定義したりもできます。
また、Devboxにはバックグラウンドサービスを起動する機能もあるようです。
Running Services

 作成されるファイルについて
今回の例では、次のようなファイルが作成されます。
example-project/
├── .devbox/       # Devboxの内部ファイル（Nixのビルド結果など）。.gitignore対象にする
├── .envrc         # direnvの設定ファイル。.gitignore対象にする
├── bun.lock       # bunの依存ライブラリのバージョンロックファイル。Git管理する
├── devbox.json    # Devboxの設定ファイル。Git管理する
├── devbox.lock    # Devboxのパッケージのロックファイル。Git管理する
├── node_modules/  # bunの依存ライブラリのインストール先。.gitignore対象にする
└── package.json   # bunのパッケージ管理ファイル。Git管理する
.envrcにはeval "$(devbox generate direnv --print-envrc)"が書かれています。これでプロジェクトディレクトリに入ると自動的にDevbox環境が有効になります。サブディレクトリに.envrcを置く場合は、source_upを記載して親ディレクトリの.envrcを呼び出すようにしましょう。
.envrcにはほかに機密情報を書かないルールにし、.envファイルなどで機密情報を管理するならGit管理するのもありかもしれません。（が、普段と違うので間違えてコミットする人もいるかも）
bun.lockやdevbox.lockは、プロジェクトの依存関係のバージョンをロックするファイルです。これらはGit管理して、チームで同じ環境を再現できるようにするのが望ましいです。また、明示的に指定する依存関係はバージョンまで指定する方が安心できます（最近、ソフトウェアサプライチェーン攻撃が増えているため）。

 VS Codeの設定
VS Codeのtasks.jsonに記載したコマンドも、Devbox環境で実行されるようにできます。
mkhl.direnv拡張機能を入れることで、VS Codeでのコマンド実行時にもdirenvが有効になるため、Devbox環境でコマンドが実行されます。
さて拡張機能ですが、VS Codeと密に連携できるDevContainerでは設定ファイルに書くことで分離した環境でのみ拡張機能を有効にできます。しかしDevboxではこの機能がなく弱点と考えています。
その対策としてVS CodeのProfile管理機能でプロジェクト専用のプロフィールを作成するのも手かもしれません。軽く試した感じでは、設定のカテゴリごとに標準のものをそのまま使うか、プロフィール専用にするか選べるようで、拡張機能だけプロフィール専用にできました。
.vscode/extensions.jsonに次のように書くと、プロジェクトを開いたときにお勧めの拡張機能として表示されます。

.vscode/extensions.json
{
  "recommendations": [
    "mkhl.direnv"
  ]
}

ただ、OAI Compatible Provider for Copilot (johnny-zhao.oai-compatible-copilot)拡張機能はシークレットを扱う（ローカルLLMとかのAPIキー）関係で、明確にプロフィールに紐づいているのか使いまわすことができませんでした（拡張機能以外の設定もプロフィール専用にすればできるのかも）。

 Docker連携
DevboxはDockerイメージの作成もサポートしています。
# Dockerfileを生成
devbox gen dockerfile

# .devcontainer/devcontainer.jsonを生成
devbox gen devcontainer
コンテナ内でもDevboxを使えるようにするだけですが、DevboxのインストールができないけどDockerは動かせるという環境であれば、これでDockerベースの環境構築もできます。

 devbox gen devcontainerの罠
SSH接続したLinuxマシンでVS CodeのRemote SSHを使って開発していますが、権限問題でDevContainerがうまく動きませんでした。
生成されるDockerfileではUID:GID 1000:1000のユーザーを作成しています。DevContainerはホストマシンのUIDと同期するしくみがデフォルトで有効になっています。しかし、Dockerfileでは1000:1000のユーザーでしかアクセスできないファイルがあり、DevContainer内のターミナルでエラーが出て使えませんでした。
\[\]\[\]\[\]devbox@d1ebd412978b\[\]:\[\]/workspaces/example-project\[\]$ \[\]devbox shell
/bin/bash: /usr/local/bin/devbox: Permission denied
devboxコマンドの所有者が1000:1000で権限が0711になっているのが原因です。ほかにもホームディレクトリや/nixディレクトリも同様に問題があります。
回避策として、イメージビルド時にホスト側のUID:GIDと同期するようにしてみました。動的同期は/nixのファイル数が多くなり時間かかると考え、レジストリに登録しないDevContainer専用のイメージでみんながローカルビルドする前提です。
devcontainer.jsonのinitializeCommandでHOST_UIDとHOST_GIDを定義した.envファイルを作らせて、DockerfileないでそのUID:GIDと同期するスクリプトを実行するようにしました。

.devcontainer/devcontainer.json
{
  "name": "Devbox Remote Container",
  // initializeCommand を追記
  "initializeCommand": "sh -lc 'printf \"HOST_UID=%s\\nHOST_GID=%s\\n\" \"$(id -u)\" \"$(id -g)\" > \"${localWorkspaceFolder}/.devcontainer/.env\"'",
  "build": {
    "dockerfile": "./Dockerfile",
    "context": ".."
  },
  "customizations": {
    "vscode": {
      "settings": {},
      "extensions": ["jetpack-io.devbox"]
    }
  },
  "remoteUser": "devbox"
}


.devcontainer/Dockerfile
FROM jetpackio/devbox:latest

# Installing your devbox project
WORKDIR /code
USER root:root
# .envとsync-devbox-user.shをコピーして実行するコマンドを追記
COPY .devcontainer/.env .devcontainer/sync-devbox-user.sh /root
RUN sh /root/sync-devbox-user.sh
RUN mkdir -p /code && chown ${DEVBOX_USER}:${DEVBOX_USER} /code
USER ${DEVBOX_USER}:${DEVBOX_USER}
COPY --chown=${DEVBOX_USER}:${DEVBOX_USER} devbox.json devbox.json
COPY --chown=${DEVBOX_USER}:${DEVBOX_USER} devbox.lock devbox.lock



RUN devbox run -- echo "Installed Packages." && nix-store --gc && nix-store --optimise

RUN devbox shellenv --init-hook >> ~/.profile


.devcontainer/sync-devbox-user.sh
#!/usr/bin/env sh
set -eu

SELF_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SELF_DIR/.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "[sync-devbox-user] skip: $ENV_FILE not found"
  exit 0
fi

# shellcheck disable=SC1090
. "$ENV_FILE"

if [ -z "${HOST_UID:-}" ] || [ -z "${HOST_GID:-}" ]; then
  echo "[sync-devbox-user] skip: HOST_UID or HOST_GID is empty"
  exit 0
fi

if ! command -v getent >/dev/null 2>&1; then
  echo "[sync-devbox-user] skip: getent is not available"
  exit 0
fi

TARGET_USER="${DEVBOX_USER:-devbox}"

if ! getent passwd "$TARGET_USER" >/dev/null 2>&1; then
  echo "[sync-devbox-user] skip: user $TARGET_USER does not exist"
  exit 0
fi

CURRENT_UID="$(id -u "$TARGET_USER")"
CURRENT_GID="$(id -g "$TARGET_USER")"

if [ "$CURRENT_GID" != "$HOST_GID" ]; then
  if getent group "$HOST_GID" >/dev/null 2>&1; then
    EXISTING_GROUP="$(getent group "$HOST_GID" | cut -d: -f1)"
    usermod -g "$HOST_GID" "$TARGET_USER"
    echo "[sync-devbox-user] reused existing group $EXISTING_GROUP ($HOST_GID)"
  else
    groupmod -g "$HOST_GID" "$TARGET_USER"
    echo "[sync-devbox-user] updated group gid: $CURRENT_GID -> $HOST_GID"
  fi
fi

if [ "$CURRENT_UID" != "$HOST_UID" ]; then
  usermod -u "$HOST_UID" "$TARGET_USER"
  echo "[sync-devbox-user] updated user uid: $CURRENT_UID -> $HOST_UID"
fi

# Ensure home directory ownership follows the new uid/gid.
TARGET_HOME="$(getent passwd "$TARGET_USER" | cut -d: -f6)"
if [ -n "$TARGET_HOME" ] && [ -d "$TARGET_HOME" ]; then
  chown -R "$HOST_UID:$HOST_GID" "$TARGET_HOME"
  chown -R "$HOST_UID:$HOST_GID" /usr/local/bin /nix
fi

echo "[sync-devbox-user] done: $TARGET_USER => $HOST_UID:$HOST_GID"

.envは.gitignore対象にしてください。これにより、ホストマシンのUID:GIDに合わせてDevContainer内のユーザーのUID:GIDが変更されます。これで、DevContainer内のターミナルでdevbox shellを実行しても権限エラーが出なくなります。
tasks.jsonなどでコマンドを実行するときはdirenv拡張機能を利用します。なので、direnvをホスト用にグローバルインストールしていても、プロジェクト用のdevbox.jsonにもdirenvを入れておく必要があります。また、VS Code拡張機能のmkhl.direnvを.vscode/extensions.jsonに入れておくと、プロジェクトを開いたときにインストールを促すことができます。コンテナ内では初回のdirenv allowも必要になります。

 まとめ
本記事では、Nixをバックエンドに利用した軽量な開発環境構築ツールであるDevboxのセットアップ手順を紹介しました。Devboxのポイントをまとめると次のようになります。

軽量かつ高速：DockerベースのDevContainerと比べて、より軽量で高速な環境構築が可能
Nixの知識が不要：Nixをバックエンドに利用しているが、devbox.jsonに書くだけでNixの強力な再現性を手軽に利用可能
Direnvとの連携：プロジェクトディレクトリに入ると自動的にDevbox環境が有効になるよう、Direnvと連携可能

DevContainerの重さに悩んでいる方や、Vim/Emacsで完結させたい方は、ぜひDevboxを試してみてください！

 参考にしたサイト
