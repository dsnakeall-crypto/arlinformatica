"""Prepare a reviewable package locally. Never connects to hosting or changes databases."""
import hashlib
import json
import pathlib
import subprocess
import zipfile
import tarfile
import argparse

ROOT = pathlib.Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser()
parser.add_argument('--production-backup',required=True)
args=parser.parse_args()
record=json.loads(pathlib.Path(args.production_backup).read_text(encoding='utf-8'))
BASE=pathlib.Path(record['archive'])
BASE_SHA=record['sha256']
if record['release']!='5c8885f6cf50757255938a39e1325bb9e91037cc' or record['all_files_verified'] is not True:
    raise RuntimeError('Verified production backup required')

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
if branch != 'codex/final-financeiro-laragon-20261013':
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
base_prefix='arl-oito-5c8885f6cf50757255938a39e1325bb9e91037cc/ARL-5c8885f6cf50757255938a39e1325bb9e91037cc/'
with tarfile.open(BASE,'r:gz') as old:
    for item in old:
        if not item.isfile() or not item.name.startswith(base_prefix):
            continue
        name=item.name[len(base_prefix):]
        if name=='.release.json':
            prior=json.loads(old.extractfile(item).read())
            if prior['release']!='5c8885f6cf50757255938a39e1325bb9e91037cc':
                raise RuntimeError('Archive contains a different production release')
        if allowed(name) and name.startswith(('vendor/','public/')) and not name.startswith('public/build/') and name not in files:
            data=old.extractfile(item).read()
            if digest(data)!=record['entries'][item.name]['sha256']:
                raise RuntimeError('Backup member hash mismatch')
            files[name]=data
    installed=json.loads(files['vendor/composer/installed.json'])
    if not isinstance(installed,dict) or installed.get('dev') is not False:
        raise RuntimeError('Vendor must be the verified production version without dev dependencies')
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
metadata = {'release': version, 'branch': branch, 'published_base': '5c8885f6cf50757255938a39e1325bb9e91037cc',
            'verified_production_backup_sha256': BASE_SHA, 'schema_changes': False, 'production_activation': 'REQUIRES_EXPLICIT_OWNER_AUTHORIZATION',
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
          'files': len(files), 'crc': 'OK', 'manifest_hashes': 'ALL_VERIFIED', 'schema_changes': False, 'activation': 'NOT_EXECUTED', 'previous_release': '5c8885f6cf50757255938a39e1325bb9e91037cc'}
report_path = out.with_suffix('.json')
report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps(report, ensure_ascii=False, indent=2))
