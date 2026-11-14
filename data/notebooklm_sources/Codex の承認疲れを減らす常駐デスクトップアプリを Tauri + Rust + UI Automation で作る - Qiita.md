# Codex の承認疲れを減らす常駐デスクトップアプリを Tauri + Rust + UI Automation で作る - Qiita
- **Source URL**: https://qiita.com/engchina/items/78f28b4467b691c3b963
- **Score**: 78
- **AI Summary**:
  - TauriとRustを用いてCodexの承認作業を自動化・制御するデスクトップツールの設計を解説
  - 600ms周期のポーリングや多重実行・連打防止のクールダウンなど安全なUI自動操作の実装コードを提示
  - UI Automationでのウィンドウ検出とコマンド解析、監査ログ記録を分離した堅牢なアーキテクチャ
- **Read Now Reason**: AIコーディングエージェント利用時のボトルネックである「手動承認の負担」を自動化する具体的なRust/TypeScriptコードが提示されています。Tauriを用いたOSレベルの自動化・監視パイプライン構築に即時応用可能な設計パターンが学べます。
- **Suggested Tags**: #AI駆動開発, #Tauri, #Rust, #Windows-UI-Automation, #自動化パイプライン
- **Processed Date**: 2026/5/28

---

## 本文
アプリのPreview

また、GitHubはこちらです。


先に結論
codex-approval-guard は、Codex Desktop の承認リクエストを監視し、条件に合うものだけを自動で承認・拒否・閉鎖するデスクトップ補助ツールです。
単に「Yes ボタンを押すツール」ではありません。
やっていることは大きく 5 つです。

Codex のウィンドウだけを UI Automation で検出する
UI テキストから command / cwd / target path / permission を抽出する
policy engine で approve / deny / dismiss / prompt を判定する
UI Automation / Win32 API で承認・拒否・閉鎖を実行する
実行結果を JSONL audit log に残す

ここが大事です。
承認疲れを減らしたい。
でも、Codex 以外の確認ダイアログを誤って押したくない。
そのため、このプロジェクトでは「ボタン文言」だけではなく、プロセス、ウィンドウ、UIA tree、承認文脈、policy、監査ログを組み合わせています。

この記事で分かること

Tauri + React + Rust で常駐デスクトップ補助ツールを作る構成
Windows UI Automation で Codex の承認リクエストを検出する方法
承認 UI の raw text から command / cwd / permission を抽出する parser 設計
自動承認・自動拒否・自動閉鎖を分ける policy engine
ユーザー操作中は自動操作しないための idle guard
audit log に何を残し、何を残さないか


対象読者

Codex Desktop を日常的に使っている方
Tauri で常駐系デスクトップツールを作りたい方
Windows UI Automation を Rust から扱いたい方
AI coding agent の承認 UX を改善したい方
「自動化したいが、誤操作は避けたい」と考えている方


全体像
ざっくり図にすると、こうなります。


ポイントは、監視、解析、判定、実行、監査が分離されていることです。
UI は React。
ネイティブ操作は Rust。
Windows の実際の観測とクリックは UI Automation / Win32 API。
この分担により、画面は普通のデスクトップアプリとして作りつつ、危険な OS 操作は Rust 側に閉じ込められます。

技術スタック
このプロジェクトは次の構成です。



レイヤー
技術
役割




Desktop shell
Tauri v2
デスクトップアプリ化、Rust bridge、配布


UI
React / TypeScript
状態表示、pause、git 例外設定、履歴表示


Core
Rust
policy、parser、audit、platform adapter


Windows adapter
UI Automation / Win32
Codex ウィンドウ検出、自動クリック、閉鎖


Storage
JSON / JSONL
policy 永続化、audit log



依存関係を見ると、Windows 側は uiautomation、windows-sys、windows を使っています。

src-tauri/Cargo.toml
[target.'cfg(target_os = "windows")'.dependencies]
uiautomation = "0.24.4"
windows-sys = { version = "0.61.2", features = [
  "Win32_Foundation",
  "Win32_System_Diagnostics_ToolHelp",
  "Win32_System_Threading",
  "Win32_UI_WindowsAndMessaging",
  "Win32_Graphics_Gdi"
] }
windows = { version = "0.62", features = [
  "Win32_Foundation",
  "Win32_UI_WindowsAndMessaging"
] }


現時点では、自動承認の本体は Windows 実装が中心です。
macOS adapter の境界はありますが、自動承認は未接続です。

常駐監視の入口
常駐処理は、OS のサービスとして動くのではなく、Tauri アプリを起動している間、React 側の interval でバックグラウンド監視します。
実際の UI 側コードはここです。

src/App.tsx
const BACKGROUND_POLL_MS = 600;
const AUTO_APPROVE_COOLDOWN_MS = 1500;

const runObservation = useCallback(
  async ({ manual }: { manual: boolean }) => {
    if (pollingRef.current) return;
    pollingRef.current = true;
    try {
      const result = await callBackend<ApprovalObservation>("observe_approval_request");
      setObservation(result);

      const inCooldown =
        !manual && Date.now() - lastApprovalAtRef.current < AUTO_APPROVE_COOLDOWN_MS;

      const autoAction = result.decision?.action;
      const shouldAutoAct =
        autoAction === "approve" || autoAction === "dismiss" || autoAction === "deny";

      if (shouldAutoAct && result.observed && !inCooldown) {
        const auto = await callBackend<AutoApproveOutcome>(
          "auto_approve_observed_request",
          { request: result.observed.request },
        );
        setAutoApprove(auto);
        lastApprovalAtRef.current = Date.now();
      }

      await loadState();
    } finally {
      pollingRef.current = false;
    }
  },
  [loadState],
);

useEffect(() => {
  const id = window.setInterval(() => {
    if (pausedRef.current) return;
    void runObservation({ manual: false });
  }, BACKGROUND_POLL_MS);

  return () => window.clearInterval(id);
}, [runObservation]);


ここで重要なのは 3 点です。

600ms ごとに観察する
多重実行を pollingRef で防ぐ
直近の自動操作から 1500ms は cooldown する

常駐系ツールでは、同じ承認リクエストを連打で処理しないことがかなり重要です。

Tauri command で Rust 側へ渡す
React から呼ばれる backend は薄いです。

src/backend.ts
import { invoke } from "@tauri-apps/api/core";

export async function callBackend<T>(
  command: string,
  args?: Record<string, unknown>,
): Promise<T> {
  return invoke<T>(command, args);
}


本体は Rust 側の Tauri command です。
observe_approval_request で検出し、auto_approve_observed_request で実際に操作します。

src-tauri/src/lib.rs
#[tauri::command]
async fn observe_approval_request(
    state: State<'_, AppState>,
) -> Result<ApprovalObservation, String> {
    let (observed, diagnostics) =
        async_runtime::spawn_blocking(platform::observe_approval_request)
            .await
            .map_err(|error| format!("UI Automation observation を実行できません: {error}"))??;

    let Some(observed_request) = observed else {
        return Ok(ApprovalObservation {
            observed: None,
            decision: None,
            recorded: false,
            details: "Codex 承認ウィンドウは検出されませんでした。".to_string(),
            diagnostics,
            platform: platform_snapshot_from_observation(&None),
        });
    };

    let policy = state.policy.lock()
        .map_err(|_| "Policy ロックを取得できません".to_string())?
        .clone();

    let decision = policy.evaluate(&observed_request.request);

    Ok(ApprovalObservation {
        observed: Some(observed_request),
        decision: Some(decision),
        recorded: false,
        details: "Codex 承認ウィンドウを観察し、承認操作を実行可能です。".to_string(),
        diagnostics,
        platform: platform_snapshot_from_observation(&Some(observed_request)),
    })
}


観察フェーズでは audit log に書きません。
理由はシンプルです。
Codex の承認ウィンドウが出ている間、polling のたびに同じ内容が記録されてしまうからです。
audit log は、実際に承認・拒否・閉鎖を実行したタイミングだけで追記します。

Windows UI Automation で Codex だけを見る
Windows adapter の最初のポイントは、UI Automation を専用スレッドで実行していることです。

src-tauri/src/platform/windows.rs
fn run_uia_task<T, F>(task: F) -> Result<T, String>
where
    T: Send + 'static,
    F: FnOnce() -> Result<T, String> + Send + 'static,
{
    let (sender, receiver) = mpsc::channel();

    thread::Builder::new()
        .name("codex-approval-guard-uia".to_string())
        .spawn(move || {
            let _ = sender.send(task());
        })
        .map_err(|error| format!("UI Automation スレッドを開始できません: {error}"))?;

    receiver
        .recv_timeout(UIA_TIMEOUT)
        .map_err(|_| "UI Automation の読み取りがタイムアウトしました。".to_string())?
}


UI Automation は外部アプリの UI tree を読むため、詰まる可能性があります。
そのため、専用スレッド + timeout にしています。
次に、top-level window を走査します。

src-tauri/src/platform/windows.rs
fn find_observed_approval(
    automation: &UIAutomation,
    top_level_walker: &UITreeWalker,
    control_walker: &UITreeWalker,
    content_walker: &UITreeWalker,
    raw_walker: &UITreeWalker,
    diagnostics: &mut ObserveDiagnostics,
) -> Result<Option<ObservedApproval>, String> {
    let root = automation.get_root_element().map_err(|error| error.to_string())?;
    let Some(windows) = top_level_walker.get_children(&root) else {
        return Ok(None);
    };

    diagnostics.windows_scanned = windows.len();

    for window in windows.iter().take(MAX_TOP_LEVEL_WINDOWS) {
        let candidate = window_candidate(window);
        let codex_process = candidate.looks_like_codex_process();
        let skip = candidate.should_skip();

        if skip || !codex_process {
            continue;
        }

        if let Some(observed) = parse_window(
            window,
            &candidate.title,
            true,
            &[
                ("content", content_walker),
                ("control", control_walker),
                ("raw-codex", raw_walker),
            ],
            diagnostics,
        ) {
            return Ok(Some(observed));
        }
    }

    Ok(None)
}


ここが安全性の大きな境界です。
「Codex っぽい文字が画面にある」だけでは処理しません。
プロセス名や実行パスから Codex / OpenAI / ChatGPT 系のプロセスかどうかを確認します。

src-tauri/src/platform/windows.rs
fn looks_like_codex_process(&self) -> bool {
    let process_image = self.process_image.as_deref().unwrap_or_default().to_lowercase();
    let process_name = self.process_name.as_deref().unwrap_or_default().to_lowercase();

    let is_codex_process_name =
        process_name == "codex.exe"
        || process_name == "codex"
        || process_name == "chatgpt.exe";

    is_codex_process_name
        || process_image.contains("\\openai.codex_")
        || process_image.contains("\\openai\\codex\\")
        || process_image.contains("\\app\\codex.exe")
        || process_image.ends_with("\\codex.exe")
        || process_image.ends_with("\\chatgpt.exe")
        || process_image.contains("\\openai\\")
}


これにより、一般的な UAC、ブラウザの権限確認、ファイルエクスプローラーなどを誤って承認しにくくしています。

UI text を parser に渡す
Codex の UI は、承認内容が通常の OS ダイアログのように構造化されているとは限りません。
そこで UI Automation から取れた raw text を正規化し、承認文脈を見ます。

src-tauri/src/platform/parser.rs
pub fn parse_observed_approval_with_context(
    title: &str,
    raw_text: Vec<String>,
    detected_by: &str,
    trusted_codex_context: bool,
) -> Option<ObservedApproval> {
    let raw_text = normalize_raw_text(raw_text);

    if looks_like_guard_self(title, &raw_text) {
        return None;
    }

    if (!trusted_codex_context && !looks_like_codex_context(title, &raw_text))
        || !looks_like_approval_text(title, &raw_text)
    {
        return None;
    }

    let prompt_text = raw_text.join("\n");
    let command = extract_command(&raw_text);
    let prompt_window = locate_prompt_window(&raw_text);
    let cwd = extract_cwd(&raw_text);
    let mut target_paths = extract_windows_paths(prompt_window.unwrap_or(&raw_text));

    for path in extract_changed_files(prompt_window.unwrap_or(&raw_text)) {
        if !target_paths.iter().any(|existing| existing == &path) {
            target_paths.push(path);
        }
    }

    Some(ObservedApproval {
        request: ApprovalRequest {
            id: None,
            source_app: "Codex Desktop".to_string(),
            window_title: title.to_string(),
            prompt_text,
            command,
            cwd,
            target_paths,
            requested_permission: infer_permission(&raw_text),
        },
        raw_text,
        detected_by: detected_by.to_string(),
    })
}


parser は次のような情報を作ります。



field
内容




window_title
Codex の対象ウィンドウタイトル


prompt_text
UIA から取れた承認文脈の raw text


command

npm test や cargo test など


cwd
working directory


target_paths
変更対象ファイルや Windows path


requested_permission

shell / file / network など



単なるクリック自動化ではなく、承認対象を構造化データにしてから policy に渡しているのがポイントです。

policy engine
policy はかなり読みやすいです。

src-tauri/src/policy.rs
pub fn evaluate(&self, request: &ApprovalRequest) -> ApprovalDecision {
    if self.paused {
        return ApprovalDecision {
            action: DecisionAction::Prompt,
            risk: RiskLevel::Medium,
            reason: "ガードは一時停止中です。ユーザー確認が必要です。".to_string(),
            matched_rule: Some("paused".to_string()),
            would_auto_approve: false,
        };
    }

    if request.requested_permission.as_deref() == Some("git_commit_dismiss") {
        return ApprovalDecision {
            action: DecisionAction::Dismiss,
            risk: RiskLevel::Low,
            reason: "Git 提交ダイアログを自動で閉じました。".to_string(),
            matched_rule: Some("auto_dismiss_git_commit".to_string()),
            would_auto_approve: false,
        };
    }

    if !self.allow_git_add && is_git_add_command(request.command.as_deref()) {
        return ApprovalDecision {
            action: DecisionAction::Deny,
            risk: RiskLevel::Medium,
            reason: "git add は実行しません。手動で行うため、このセッション中（同一会話内）はこれ以降 git add を実行・提案しないでください。".to_string(),
            matched_rule: Some("manual_git_add".to_string()),
            would_auto_approve: false,
        };
    }

    if !self.allow_git_commit && is_git_commit_command(request.command.as_deref()) {
        return ApprovalDecision {
            action: DecisionAction::Deny,
            risk: RiskLevel::Medium,
            reason: "git commit は実行しません。手動で行うため、このセッション中（同一会話内）はこれ以降 git commit を実行・提案しないでください。".to_string(),
            matched_rule: Some("manual_git_commit".to_string()),
            would_auto_approve: false,
        };
    }

    ApprovalDecision {
        action: DecisionAction::Approve,
        risk: RiskLevel::Low,
        reason: "自動承認しました。".to_string(),
        matched_rule: Some("auto_approve_all".to_string()),
        would_auto_approve: true,
    }
}


現在の思想はこうです。

pause 中は何もしない
git commit dialog は自動で閉じる

git add はデフォルトで拒否

git commit もデフォルトで拒否
それ以外は自動承認

この設計は実用的です。
Codex の反復作業では npm test、cargo test、rg、node などの確認コマンド承認が何度も出ます。
一方で、git add や git commit はユーザーが意図を確認してから行いたい操作です。
だから、全部を雑に approve するのではなく、日常的な反復承認だけを軽くしています。

自動操作の前に user idle を見る
自動操作で一番怖いのは、ユーザーがマウスやキーボードを触っている瞬間に、アプリ側がクリックを奪うことです。
このプロジェクトでは、直近のユーザー入力から 1500ms 未満なら自動操作をスキップします。

src-tauri/src/lib.rs
const USER_ACTIVITY_GUARD_MS: u32 = 1500;

#[tauri::command]
async fn auto_approve_observed_request(
    request: ApprovalRequest,
    state: State<'_, AppState>,
) -> Result<AutoApproveOutcome, String> {
    let policy_snapshot = {
        let policy = state.policy.lock()
            .map_err(|_| "Policy ロックを取得できません".to_string())?;

        if policy.paused {
            return Err("ガードは一時停止中です。自動承認は実行できません。".to_string());
        }

        policy.clone()
    };

    let idle_ms = platform::user_idle_ms();
    if idle_ms < USER_ACTIVITY_GUARD_MS {
        return Err(format!(
            "ユーザー操作中のため自動承認をスキップしました（idle={}ms < {}ms）。",
            idle_ms, USER_ACTIVITY_GUARD_MS
        ));
    }

    let decision = policy_snapshot.evaluate(&request);
    let is_dismiss = decision.action == DecisionAction::Dismiss;
    let is_deny = decision.action == DecisionAction::Deny;

    if decision.action != DecisionAction::Approve && !is_dismiss && !is_deny {
        return Err(format!(
            "policy 判定が approve/dismiss/deny ではありません ({:?})。自動操作を中止しました。",
            decision.action
        ));
    }

    let is_git_commit_hint = request
        .requested_permission
        .as_deref()
        .map(|permission| permission == "git_commit_dismiss")
        .unwrap_or(false);

    let click = if is_deny {
        async_runtime::spawn_blocking(move || {
            platform::click_no_in_codex_approval(is_git_commit_hint)
        }).await.map_err(|error| format!("自動操作の実行に失敗しました: {error}"))??
    } else {
        async_runtime::spawn_blocking(move || {
            platform::click_yes_in_codex_approval(is_git_commit_hint)
        }).await.map_err(|error| format!("自動操作の実行に失敗しました: {error}"))??
    };

    state.audit.append(&request, &decision)?;

    Ok(AutoApproveOutcome {
        decision,
        click,
        audited: true,
    })
}


ここも大事です。
「自動化」だからといって、いつでも勝手にクリックしていいわけではありません。
常駐デスクトップアプリでは、ユーザー入力との競合を避ける設計が必要です。

クリック対象の選び方
Codex の承認 UI は言語や種類によって文言が変わります。
たとえば：

1. 是
1. はい
Approve
1. Option A (Recommended)
送信
提交
Continue
続行

このため、matcher は複数言語対応になっています。

src-tauri/src/platform/windows.rs
fn is_recommended_option(name: &str) -> bool {
    let trimmed = name.trim();
    let lower = trimmed.to_lowercase();

    let has_marker = trimmed.contains("（推荐）")
        || trimmed.contains("(推荐)")
        || trimmed.contains("（推奨）")
        || trimmed.contains("(推奨)")
        || trimmed.contains("（おすすめ）")
        || trimmed.contains("(おすすめ)")
        || lower.contains("(recommended)")
        || lower.contains("（recommended）");

    if !has_marker {
        return false;
    }

    starts_with_recommended_prefix(trimmed)
}

fn is_first_yes_or_recommended_option(name: &str) -> bool {
    is_first_yes_option(name) || is_recommended_option(name)
}

fn is_submit_button(name: &str) -> bool {
    let trimmed = name.trim();
    let lower = trimmed.to_lowercase();

    trimmed.starts_with("提交")
        || trimmed.starts_with("送信")
        || trimmed.starts_with("確認")
        || trimmed.starts_with("继续")
        || trimmed.starts_with("続行")
        || trimmed.starts_with("継続")
        || lower.starts_with("submit")
        || lower.starts_with("continue")
        || lower == "ok"
}


ここから分かるのは、実用的な desktop automation では「英語 UI だけ」を想定するとすぐ壊れるということです。
Codex を日本語 UI、中国語 UI、英語 UI のどれで使っても動くように、承認キーワード、拒否キーワード、送信ボタンを広めに拾っています。

git commit dialog は特別扱いする
このプロジェクトでは、通常の approve だけでなく dismiss もあります。
特に git commit dialog は、独立した window として出る場合と、WebView 内 modal として出る場合があります。
独立 HWND の場合は WM_CLOSE が速いです。

src-tauri/src/platform/windows.rs
fn try_close_window_via_wm_close(
    window: &UIElement,
    outcome: &mut ClickOutcome,
) -> bool {
    let handle = match window.get_native_window_handle() {
        Ok(handle) => handle,
        Err(error) => {
            outcome.notes.push(format!(
                "WM_CLOSE 経路: HWND 取得失敗（{error}）。UIA 経路へフォールバック。"
            ));
            return false;
        }
    };

    let hwnd_win: windows::Win32::Foundation::HWND = handle.into();
    let hwnd_raw = hwnd_win.0 as windows_sys::Win32::Foundation::HWND;

    if hwnd_raw.is_null() {
        return false;
    }

    let ok = unsafe {
        windows_sys::Win32::UI::WindowsAndMessaging::PostMessageW(
            hwnd_raw,
            windows_sys::Win32::UI::WindowsAndMessaging::WM_CLOSE,
            0,
            0,
        )
    };

    ok != 0
}


WebView 内 modal の場合は、Escape を送る経路も使います。
さらに失敗したら UIA の close / cancel ボタンへフォールバックします。
ここは、実際のデスクトップアプリらしいところです。
UI Automation だけで完結しようとすると、WebView 内の modal や独立 window の違いで詰まります。
だから、UIA、WM_CLOSE、VK_ESCAPE を組み合わせています。

audit log
自動操作をしたら、JSONL に audit log を残します。

src-tauri/src/audit.rs
pub fn append(
    &self,
    request: &ApprovalRequest,
    decision: &ApprovalDecision,
) -> Result<AuditEntry, String> {
    let entry = AuditEntry {
        id: Uuid::new_v4().to_string(),
        created_at,
        request: request.redacted(),
        decision: decision.clone(),
    };

    if let Some(parent) = self.path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|error| format!("監査ログディレクトリを作成できません: {error}"))?;
    }

    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&self.path)
        .map_err(|error| format!("監査ログを開けません: {error}"))?;

    let line = serde_json::to_string(&entry)
        .map_err(|error| format!("監査ログをシリアライズできません: {error}"))?;

    writeln!(file, "{line}")
        .map_err(|error| format!("監査ログを書き込めません: {error}"))?;

    Ok(entry)
}


保存前には ApprovalRequest::redacted() を通しています。
token、secret、password、credential のような語を含む値は [REDACTED] に置換されます。
常駐ツールでは、ログが便利であるほど、ログに何を残さないかも重要になります。

この実装から学べること

1. 常駐アプリは「処理の分離」が重要
このプロジェクトでは、監視 loop、UIA 観測、parser、policy、click、audit が分かれています。
これにより、どこで誤検出したのか、どこで policy が止めたのか、どの click 経路が成功したのかを追いやすくなっています。

2. button text だけで自動承認しない
「Approve というボタンがあるから押す」は危険です。
この実装では、まず Codex process かどうかを見ます。
次に UI text が承認文脈かどうかを見ます。
それから policy に通します。

3. 自動承認にも deny / dismiss が必要
自動化というと approve に目が行きます。
でも実運用では、拒否したいもの、自動で閉じたいものもあります。
このプロジェクトでは：

通常の確認コマンドは approve

git add は deny

git commit は deny
git commit dialog は dismiss

というように、自動操作の種類を分けています。

4. ユーザー操作中は動かない
desktop automation は、ユーザーの操作と競合します。
GetLastInputInfo で idle time を見て、直近の入力から短すぎる場合は自動操作を止める。
これは小さいようで、体験を大きく左右する設計です。

5. 監査ログは「安心して任せる」ために必要
自動承認は便利ですが、あとから何が起きたか分からないと不安になります。
だから、request、decision、matched rule、method を JSONL に残します。
逆に、sensitive な値は redaction します。

開発方法
ローカルで動かす場合は次の通りです。
npm install
npm run tauri:dev

検証は次のコマンドです。
npm run build
npm run cargo:test
npm run tauri:build

Windows では NSIS installer を生成します。
macOS は app / dmg bundle の生成が用意されています。

まとめ
codex-approval-guard は、Codex の承認疲れを減らすための小さなデスクトップアプリです。
しかし中身を見ると、かなり実践的な設計になっています。

React が常駐監視 loop を持つ
Tauri command で Rust に渡す
Windows UI Automation で Codex window を検出する
parser が raw UI text を構造化する
policy が approve / deny / dismiss / prompt を決める
UIA / Win32 API で実際に操作する
audit log に結果を残す

単なるクリック自動化ではなく、AI coding agent の承認 UX をどう安全に軽くするか、という実装です。
Codex を長時間使う人ほど、承認リクエストの積み重なりが効いてきます。
その反復部分を小さく自動化しつつ、pause、policy、audit で制御できるようにしている点が、このプロジェクトの一番おもしろいところです。
