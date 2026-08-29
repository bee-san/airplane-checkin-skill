#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

python3 - "$root" <<'PY'
from pathlib import Path
import re
import subprocess
import sys

root = Path(sys.argv[1]).resolve()
excluded_parts = {'.git', 'node_modules', '.runtime', 'artifacts'}
excluded_files = {Path('scripts/secret-scan.sh')}

try:
    output = subprocess.check_output(
        ['git', 'ls-files', '--cached', '--others', '--exclude-standard'],
        cwd=root,
        text=True,
    )
    relative_files = [Path(line) for line in output.splitlines() if line]
except subprocess.CalledProcessError:
    relative_files = [p.relative_to(root) for p in root.rglob('*') if p.is_file()]

patterns = {
    'GitHub token': re.compile(r'\b(?:gh[opsu]_|github_pat_)[A-Za-z0-9_]+\b'),
    'AWS access key': re.compile(r'\bAKIA[0-9A-Z]{16}\b'),
    'private key': re.compile(r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----'),
    'macOS home path': re.compile(r'/Users/[A-Za-z0-9._-]+/'),
    'Linux home path': re.compile(r'/home/[A-Za-z0-9._-]+/'),
    'email address': re.compile(r'\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b', re.I),
}
allowed_emails = {'security@example.com'}
allowed_env_values = {
    'ANA_RESERVATION_NUMBER': 'ABC123',
    'ANA_FIRST_NAME': 'GIVENNAME',
    'ANA_LAST_NAME': 'FAMILYNAME',
}

findings = []
for rel in relative_files:
    if rel in excluded_files or any(part in excluded_parts for part in rel.parts):
        continue
    path = root / rel
    try:
        text = path.read_text(encoding='utf-8')
    except (UnicodeDecodeError, OSError):
        continue

    for name, pattern in patterns.items():
        for match in pattern.finditer(text):
            if name == 'email address' and match.group(0).lower() in allowed_emails:
                continue
            line = text.count('\n', 0, match.start()) + 1
            findings.append(f'{rel}:{line}: potential {name}')

    for line_no, line in enumerate(text.splitlines(), 1):
        for key, placeholder in allowed_env_values.items():
            if line.startswith(key + '=') and line != f'{key}={placeholder}':
                findings.append(f'{rel}:{line_no}: non-placeholder {key}')

if findings:
    print('\n'.join(findings))
    print('Secret/privacy scan failed')
    raise SystemExit(1)

print(f'Secret/privacy scan passed ({len(relative_files)} paths considered)')
PY
