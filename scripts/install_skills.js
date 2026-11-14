/**
 * Vesper ナレッジベース参照スキル（templates/vesper_kb_skill.md）を
 * Antigravity および Claude Code のグローバルスキルディレクトリへ配布・同期するスクリプト
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT_DIR = path.resolve(__dirname, '..');
const SOURCE_SKILL = path.join(ROOT_DIR, 'templates', 'vesper_kb_skill.md');

const HOME_DIR = os.homedir();
const TARGETS = [
  {
    name: 'Antigravity (Global)',
    dest: path.join(HOME_DIR, '.gemini', 'config', 'skills', 'vesper-kb', 'SKILL.md'),
  },
  {
    name: 'Claude Code (Global)',
    dest: path.join(HOME_DIR, '.claude', 'skills', 'vesper-kb', 'SKILL.md'),
  },
];

function main() {
  if (!fs.existsSync(SOURCE_SKILL)) {
    console.error(`[Error] スキル原本が見つかりません: ${SOURCE_SKILL}`);
    process.exit(1);
  }

  const content = fs.readFileSync(SOURCE_SKILL, 'utf8');
  console.log('=== Vesper KB グローバルスキル配布開始 ===');
  console.log(`Source (SSoT): ${SOURCE_SKILL}`);

  for (const target of TARGETS) {
    const dir = path.dirname(target.dest);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(target.dest, content, 'utf8');
    console.log(`  [OK] ${target.name} -> ${target.dest}`);
  }

  console.log('=== 配布完了 ===');
}

main();
