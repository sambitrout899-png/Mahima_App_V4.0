// fix_unquoted_api_paths.js
// Node script to fix accidental unquoted /api/... tokens in src/api/*.js
// Usage: node fix_unquoted_api_paths.js

const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();
const apiDir = path.join(projectRoot, 'src', 'api');

if (!fs.existsSync(apiDir)) {
  console.error('Directory not found:', apiDir);
  process.exit(1);
}

const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = path.join(projectRoot, `backup_fix_regex_${ts}`);
fs.mkdirSync(backupDir, { recursive: true });
console.log('Backing up src/api ->', backupDir);

const files = fs.readdirSync(apiDir).filter(f => f.endsWith('.js'));

if (files.length === 0) {
  console.log('No .js files found in', apiDir);
  process.exit(0);
}

files.forEach(file => {
  const full = path.join(apiDir, file);
  const text = fs.readFileSync(full, { encoding: 'utf8' });

  // Save backup
  fs.writeFileSync(path.join(backupDir, file), text, { encoding: 'utf8' });

  let updated = text;

  // Fix common problematic patterns where /api/... was unquoted and became a regex literal:
  updated = updated.replace(/call\(\s*\/api/g, "call('/api");
  updated = updated.replace(/call\(\s*\/\s*api/g, "call('/api");

  updated = updated.replace(/fetch\(\s*\/api/g, "fetch('/api");
  updated = updated.replace(/fetch\(\s*\/\s*api/g, "fetch('/api");

  updated = updated.replace(/\(\s*\/api/g, "('/api");
  updated = updated.replace(/=\s*\/api/g, "= '/api");
  updated = updated.replace(/:\s*\/api/g, ": '/api");
  updated = updated.replace(/,\s*\/api/g, ", '/api");

  updated = updated.replace(/=>\s*call\(\s*\/api/g, "=> call('/api");

  // Safety: avoid introducing odd quote changes
  const origSingleQuotes = (text.match(/'/g) || []).length;
  const newSingleQuotes = (updated.match(/'/g) || []).length;
  if (((origSingleQuotes - newSingleQuotes) % 2) !== 0) {
    console.warn(`Skipping write for ${file} â€” quote-count changed oddly. Manual check needed.`);
    return;
  }

  if (updated !== text) {
    fs.writeFileSync(full, updated, { encoding: 'utf8' });
    console.log('Fixed and wrote:', file);
    // preview first 30 lines
    const preview = updated.split(/\r?\n/).slice(0, 30).join('\n');
    console.log('--- preview (first 30 lines) ---\n' + preview + '\n--- end preview ---\n');
  } else {
    console.log('No changes needed:', file);
  }
});

console.log('Done. Restart your dev server (npm run dev) and reload the app.');
console.log('If you still get the same error, paste the first 20 lines of src/api/users.js here and I will inspect them.');



