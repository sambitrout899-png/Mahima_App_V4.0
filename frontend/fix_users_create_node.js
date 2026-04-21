// fix_users_create_node.js
// Node script to safely patch src/features/users/Page.jsx:
// - creates a timestamped backup if not already present
// - inserts prepareForCreate helper after import block if missing
// - replaces usersApi.create(form) with usersApi.create(prepareForCreate(form))
// - replaces await usersApi.create(form) similarly
//
// Run: node fix_users_create_node.js

const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();
const usersPage = path.join(projectRoot, 'src', 'features', 'users', 'Page.jsx');

if (!fs.existsSync(usersPage)) {
  console.error('users Page.jsx not found at:', usersPage);
  process.exit(1);
}

// read file
let text = fs.readFileSync(usersPage, 'utf8');

// backup once per run
const bakPath = usersPage + '.bak_' + new Date().toISOString().replace(/[:.]/g,'-');
fs.writeFileSync(bakPath, text, { encoding: 'utf8' });
console.log('Backed up', usersPage, '->', path.basename(bakPath));

// helper to detect if prepareForCreate exists
if (!/function\s+prepareForCreate\s*\(/.test(text)) {
  // find end of import block (last import line)
  const lines = text.split(/\r?\n/);
  let lastImport = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*import\b/.test(lines[i])) lastImport = i;
  }

  const helper = [
    'function prepareForCreate(p) {',
    "  const payload = Object.assign({}, p || {});",
    "  if ('id' in payload) delete payload.id;",
    "  if ('Id' in payload) delete payload.Id;",
    "  if (payload.joinDate) { try { payload.joinDate = new Date(payload.joinDate).toISOString(); } catch(e) { delete payload.joinDate; } }",
    "  if (payload.lastLogin) { try { payload.lastLogin = new Date(payload.lastLogin).toISOString(); } catch(e) { delete payload.lastLogin; } }",
    "  return payload;",
    "}",
    ""
  ].join('\n');

  if (lastImport >= 0) {
    // insert after last import line
    const before = lines.slice(0, lastImport + 1).join('\n');
    const after = lines.slice(lastImport + 1).join('\n');
    text = before + '\n\n' + helper + after;
  } else {
    // no imports found â€” prepend
    text = helper + '\n' + text;
  }
  console.log('Inserted prepareForCreate helper.');
} else {
  console.log('prepareForCreate already present â€” skipping insertion.');
}

// perform replacements in a tolerant way
let orig = text;
let replaced = 0;

// common patterns
const patterns = [
  { from: /await\s+usersApi\.create\s*\(\s*form\s*\)/g, to: 'await usersApi.create(prepareForCreate(form))' },
  { from: /usersApi\.create\s*\(\s*form\s*\)/g, to: 'usersApi.create(prepareForCreate(form))' }
];

for (const p of patterns) {
  const newText = text.replace(p.from, p.to);
  if (newText !== text) {
    replaced++;
    text = newText;
  }
}

if (replaced > 0) {
  fs.writeFileSync(usersPage, text, { encoding: 'utf8' });
  console.log(`Replaced ${replaced} create(...) pattern(s) and wrote ${usersPage}`);
} else {
  // still write file if helper was inserted
  if (text !== orig) {
    fs.writeFileSync(usersPage, text, { encoding: 'utf8' });
    console.log('Wrote file with helper insertion (no create(...) patterns found).');
  } else {
    console.log('No changes needed (helper present and no create(form) patterns detected).');
  }
}

console.log('Done. Please restart frontend (npm run dev) and test Create. If it fails, copy the network request payload and response body and paste here.');



