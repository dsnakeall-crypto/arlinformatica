"""Prepare a reviewable package locally. Never connects to hosting or changes databases."""
import hashlib
import json
import pathlib
import subprocess
import zipfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
BASE = ROOT / 'output' / 'releases' / 'ARL-OITO-MELHORIAS-9a90223304d4.zip'
BASE_SHA = '6c824132b1dc808ddd3ac2999c052108fb4f3f3a5d70c306ab53efc93b4dc676'

def git(*args):
    return subprocess.check_output(['git', '-C', str(ROOT), *args])

def digest(data):
    return hashlib.sha256(data).hexdigest()

def allowed(name):
    parts = pathlib.PurePosixPath(name).parts
    return bool(parts) and not any(p in ('.git', '.agents', 'node_modules', 'storage', 'output') for p in parts) and not any(p.startswith('.env') for p in parts) and not name.startswith('bootstrap/cache/')

if digest(BASE.read_bytes()) != BASE_SHA:
    raise RuntimeError('Published base package checksum differs; blocked')
version = git('rev-parse', 'HEAD').decode().strip()
branch = git('branch', '--show-current').decode().strip()
if branch != 'codex/oito-melhorias-20261012':
    raise RuntimeError('Unexpected development branch')
tracked = git('ls-files', '-z').decode().split('\0')
runtime_roots = ('app/', 'bootstrap/', 'config/', 'database/migrations/', 'database/seeders/', 'public/', 'resources/', 'routes/')
files = {}
for name in tracked:
    if not name or not allowed(name) or name.endswith('.gitignore'):
        continue
    if name.startswith(runtime_roots) or name in ('artisan', 'composer.json', 'composer.lock'):
        committed = git('show', f'HEAD:{name}')
        local = (ROOT / name).read_bytes()
        if local.replace(b'\r\n', b'\n') != committed.replace(b'\r\n', b'\n'):
            raise RuntimeError(f'Uncommitted runtime source: {name}')
        files[name] = committed
with zipfile.ZipFile(BASE) as old:
    for item in old.infolist():
        if item.is_dir():
            continue
        name = '/'.join(item.filename.split('/')[1:])
        if not allowed(name):
            continue
        if name.startswith(('vendor/', 'public/')) and name not in files:
            files[name] = old.read(item)
    installed = json.loads(files['vendor/composer/installed.json'])
    if not isinstance(installed, dict) or installed.get('dev') is not False:
        raise RuntimeError('Vendor must match the validated production base without dev dependencies')
for folder in ('public/build', 'public/arl-assets/expense-ocr'):
    for file in (ROOT / folder).rglob('*'):
        if file.is_file():
            name = file.relative_to(ROOT).as_posix()
            if allowed(name):
                files[name] = file.read_bytes()
manifest = json.loads(files['public/build/manifest.json'])
for entry in manifest.values():
    for asset in [entry['file'], *entry.get('css', []), *entry.get('assets', [])]:
        if f'public/build/{asset}' not in files:
            raise RuntimeError(f'Missing compiled asset: {asset}')
metadata = {'release': version, 'branch': branch, 'published_base': '9a90223304d404de1dfb867cc109952ca0b99ca5',
            'base_package_sha256': BASE_SHA, 'schema_changes': False, 'production_activation': 'REQUIRES_EXPLICIT_OWNER_AUTHORIZATION',
            'files': {name: digest(data) for name, data in sorted(files.items())}}
files['.release.json'] = json.dumps(metadata, ensure_ascii=False, indent=2).encode('utf-8')
out = ROOT / 'output' / 'releases' / f'ARL-OITO-MELHORIAS-{version[:12]}.zip'
if out.exists():
    raise RuntimeError('Package already exists; never overwrite a previous release')
out.parent.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile(out, 'x', compression=zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
    for name, data in sorted(files.items()):
        archive.writestr(f'ARL-{version}/{name}', data)
with zipfile.ZipFile(out) as archive:
    if archive.testzip() is not None:
        raise RuntimeError('ZIP integrity failed')
    for name, expected in metadata['files'].items():
        if digest(archive.read(f'ARL-{version}/{name}')) != expected:
            raise RuntimeError(f'Packaged file differs: {name}')
report = {'package': str(out), 'release': version, 'sha256': digest(out.read_bytes()), 'bytes': out.stat().st_size,
          'files': len(files), 'crc': 'OK', 'manifest_hashes': 'ALL_VERIFIED', 'schema_changes': False, 'activation': 'NOT_EXECUTED', 'previous_release': '9a90223304d404de1dfb867cc109952ca0b99ca5'}
report_path = out.with_suffix('.json')
report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps(report, ensure_ascii=False, indent=2))
