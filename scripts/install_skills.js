/**
 * Vesper ナレッジベース参照スキル（templates/vesper_kb_skill.md）および
 * 専属司書サブエージェント（vesper-librarian）を Antigravity / Claude Code の
 * グローバル設定ディレクトリへ配布・同期するスクリプト
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT_DIR = path.resolve(__dirname, '..');
const TEMPLATES_DIR = path.join(ROOT_DIR, 'templates');
const HOME_DIR = os.homedir();

const DEPLOYMENTS = [
  {
    name: 'Skill: Antigravity (Global)',
    src: path.join(TEMPLATES_DIR, 'vesper_kb_skill.md'),
    dest: path.join(HOME_DIR, '.gemini', 'config', 'skills', 'vesper-kb', 'SKILL.md'),
  },
  {
    name: 'Skill: Claude Code (Global)',
    src: path.join(TEMPLATES_DIR, 'vesper_kb_skill.md'),
    dest: path.join(HOME_DIR, '.claude', 'skills', 'vesper-kb', 'SKILL.md'),
  },
  {
    name: 'Agent: Antigravity vesper-librarian (Global)',
    src: path.join(TEMPLATES_DIR, 'vesper_librarian_agent_agy.md'),
    dest: path.join(HOME_DIR, '.gemini', 'config', 'agents', 'vesper-librarian.md'),
  },
  {
    name: 'Agent: Claude Code vesper-librarian (Global)',
    src: path.join(TEMPLATES_DIR, 'vesper_librarian_agent_claude.md'),
    dest: path.join(HOME_DIR, '.claude', 'agents', 'vesper-librarian.md'),
  },
];

function main() {
  for (const item of DEPLOYMENTS) {
    if (!fs.existsSync(item.src)) {
      console.error(`[Error] 原本ファイルが見つかりません: ${item.src}`);
      process.exit(1);
    }
  }

  console.log('=== Vesper KB スキル & 司書エージェント配布開始 ===');
  for (const item of DEPLOYMENTS) {
    const content = fs.readFileSync(item.src, 'utf8');
    fs.mkdirSync(path.dirname(item.dest), { recursive: true });
    fs.writeFileSync(item.dest, content, 'utf8');
    console.log(`  [OK] ${item.name} -> ${item.dest}`);
  }
  console.log('=== 配布完了 ===');
}

main();
