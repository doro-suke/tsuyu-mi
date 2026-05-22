# GitHub - unsolublesugar/tsuyu-mi: Fetch, summarize, and publish Raindrop.io articles as a priority-ranked HTML dashboard · GitHub
- **Source URL**: https://github.com/unsolublesugar/tsuyu-mi
- **Score**: 88
- **AI Summary**:
  - Raindrop.ioの保存記事をAIで自動要約し、優先度付きのHTMLダッシュボードを生成するツール。
  - GeminiやOpenAI等の複数LLMに対応し、GitHub Actionsによる定期的な自動実行が可能。
  - 各記事に対し「今読む理由」「後回し理由」を明示し、効率的なトリアージを支援する設計。
- **Read Now Reason**: AI駆動の自動化パイプラインの具体的実装例であり、GitHub ActionsとLLM APIの連携手法を即座にコードレベルで確認できるため。
- **Suggested Tags**: #AI自動化パイプライン, #GitHubActions
- **Processed Date**: 2026/5/9

---

## 本文
日本語







Periodically fetches articles from a Raindrop.io collection, extracts their content, summarizes them with AI, and outputs a priority-ranked HTML dashboard.

The name Tsuyu-mi comes from: Raindrop → shizuku (雫, droplet) → tsuyu (露, dew) → tsuyu-mi (露見, "seeing the dew").

Purpose
Triage your "read later" articles saved in Raindrop — before reading the full text.

Read now — timely or high-value
Defer — interesting but not urgent
Drop — safe to discard

Setup
1. Clone the repository
git clone https://github.com/unsolublesugar/tsuyu-mi.git
cd tsuyu-mi
2. Prepare the Python environment
NotePython 3.11 or later is required. uv can install Python itself alongside dependencies.

# Using uv (recommended)
uv venv --python 3.11
source .venv/bin/activate
uv pip install -e ".[dev]"

# Using pip
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
3. Obtain API keys
This tool requires a Raindrop.io API token and an LLM API key.
Raindrop.io test token

Go to Raindrop.io Integrations
Click Create new app under "For Developers"
Enter an app name (e.g. RaindropSummarizer) and create it
Click the app → Create test token
Copy the displayed token

Collection ID

Open Raindrop.io
Navigate to the target collection (e.g. "Unsorted")
Check the URL: https://app.raindrop.io/my/{collection_id} — the numeric part is the collection ID

LLM API key
Obtain an API key from one of the following providers:
Google Gemini (recommended — has a free tier)

Go to Google AI Studio
Create API Key → Create API key in new project
Recommended model: gemini-2.5-flash


OpenAI

Go to OpenAI API Keys
Create new secret key
Recommended model: gpt-4.1-mini

Anthropic

Go to Anthropic Console
Create Key
Recommended model: claude-haiku-4-5-20251001

4. Configure environment variables
Local execution
cp .env.example .env
Edit .env with your keys:
RAINDROP_TOKEN=your-raindrop-token
RAINDROP_COLLECTION_ID=your-collection-id
LLM_PROVIDER=gemini
LLM_API_KEY=your-llm-api-key
LLM_MODEL=gemini-2.5-flash
WarningNever commit .env to the repository — it contains secrets.

GitHub Actions
Add the following to your repository: Settings → Secrets and variables → Actions → Repository secrets.



Secret name
Value




RAINDROP_TOKEN
Raindrop.io API test token


RAINDROP_COLLECTION_ID
Target collection ID


LLM_PROVIDER
gemini / openai / anthropic


LLM_API_KEY
LLM API key


LLM_MODEL
Model name (e.g. gemini-2.5-flash)



5. Verify
# Test Raindrop API connectivity only (no LLM required)
python -m src fetch-only

# Summarize a small batch
MAX_SUMMARIZE_PER_RUN=3 python -m src run

# Full run
python -m src run
Usage
# Full pipeline (fetch → extract → summarize → generate HTML)
python -m src run

# Dry run — preview target articles without processing
python -m src run --dry-run

# Verbose logging
python -m src run --verbose

# Fetch from Raindrop only
python -m src fetch-only

# Regenerate HTML
python -m src build-html

# Reprocess a specific article
python -m src reprocess --id 123456789

# Retry all failed articles
python -m src reprocess-failed
Output
An article dashboard is generated at docs/index.html. Open it in a browser to review.

Color-coded by priority (HIGH = red / MEDIUM = yellow / LOW = gray)
Filter buttons to narrow by priority
Each article shows a 3-line summary, read-now reason, defer reason, and keywords

Configuration



Environment variable
Description
Default




RAINDROP_TOKEN
Raindrop.io API test token
(required)


RAINDROP_COLLECTION_ID
Target collection ID
(required)


LLM_PROVIDER
openai / gemini / anthropic
openai


LLM_API_KEY
LLM API key
(required)


LLM_MODEL
Model name
(required)


MAX_SUMMARIZE_PER_RUN
Max articles to summarize per run
10


REQUEST_TIMEOUT_SECONDS
HTTP request timeout (seconds)
20


USER_AGENT
HTTP User-Agent header
Tsuyu-mi/0.1


OUTPUT_DIR
HTML output directory
docs


DATA_DIR
Data storage directory
data


STATE_DIR
State management directory
state


LOG_LEVEL
Log level
INFO



Automated operation with GitHub Actions
1. Set up GitHub Secrets
See "4. Configure environment variables → GitHub Actions" above.
2. Enable GitHub Pages
Settings → Pages → Source: GitHub Actions
ImportantPrivate repositories require GitHub Pro or higher to use GitHub Pages.

3. Execution schedule

Automatic: Every 3 days at JST 7:00 (UTC 22:00)
Manual: Run on demand from the Actions tab via "Run workflow"

Changes are auto-committed and pushed only when new content is generated.
Testing
pytest
License
MIT
