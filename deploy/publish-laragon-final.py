"""Explicit, code-only release. Backups stream directly to the owner's PC.

Requires the local SSH credential file and known_hosts. Never logs credentials,
uploads a database, runs migrations, or operates on TERRAPLAN.
"""
import argparse
import base64
import hashlib
import json
import pathlib
import re
import shlex
import sys
import tarfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
BACKUPS = pathlib.Path(r'C:\Users\Allan\OneDrive\Programacao APP\App Arl Informatica\Backups')
PREVIOUS = '5c8885f6cf50757255938a39e1325bb9e91037cc'
HOME = '/home/arlinfocg'
OLD_BASE = 'arl-oito-' + PREVIOUS
OLD = HOME + '/' + OLD_BASE + '/ARL-' + PREVIOUS
ALIASES = ['index.php', 'cron-scheduler.php', 'sw.js', 'build/manifest.json']
PATHS = [OLD_BASE, 'arl-private', *['www/' + name for name in ALIASES]]
EXCLUDED = ['arl-private/deployment.lock', 'arl-private/storage/framework', 'arl-private/storage/logs']


def check(condition, code):
    if not condition:
        raise RuntimeError(code)


def sha_file(path):
    digest = hashlib.sha256()
    with open(path, 'rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(block)
    return digest.hexdigest()


def save(path, data):
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding='utf-8')


def connect():
    import paramiko
    client = paramiko.SSHClient()
    client.load_host_keys(str(pathlib.Path.home() / '.ssh' / 'known_hosts'))
    client.set_missing_host_key_policy(paramiko.RejectPolicy())
    password = (ROOT / 'senhassh.txt').read_text(encoding='utf-8-sig').strip()
    check(password and '\n' not in password and '\r' not in password, 'CREDENTIAL_FORMAT_INVALID')
    client.connect('web1f08.kinghost.net', username='arlinfocg', password=password,
                   look_for_keys=False, allow_agent=False, timeout=20, auth_timeout=20)
    return client


def php_command(source):
    encoded = base64.b64encode(source.encode()).decode()
    return "/usr/bin/php82 -d display_errors=0 -d log_errors=0 -d memory_limit=512M -r " + shlex.quote('eval(base64_decode("' + encoded + '"));')


def remote_json(client, source):
    _, stdout, stderr = client.exec_command(php_command(source), timeout=120)
    data = stdout.read()
    stderr.read()  # Never expose remote stderr; it may contain private environment values.
    check(stdout.channel.recv_exit_status() == 0, 'REMOTE_READ_FAILED')
    return json.loads(data)


def manifest(client):
    source = r'''
$home='/home/arlinfocg';$paths=json_decode(base64_decode('%PATHS%'),true);$exclude=json_decode(base64_decode('%EXCLUDED%'),true);$result=[];
if(realpath($home.'/arl-current-e90f11f')!=='%OLD%')exit(31);
$walk=function($relative)use(&$walk,&$result,$home,$exclude){
 foreach($exclude as $skip)if($relative===$skip||str_starts_with($relative,$skip.'/'))return;
 $path=$home.'/'.$relative;
 if(is_link($path)){$result[$relative]=['type'=>'link','target'=>readlink($path)];return;}
 if(is_dir($path)){foreach(scandir($path) as $name)if($name!=='.'&&$name!=='..')$walk($relative.'/'.$name);return;}
 if(!is_file($path))exit(32);
 $result[$relative]=['type'=>'file','size'=>filesize($path),'sha256'=>hash_file('sha256',$path)];
};foreach($paths as $path)$walk($path);ksort($result);echo json_encode($result,JSON_THROW_ON_ERROR);
'''
    source = source.replace('%PATHS%', base64.b64encode(json.dumps(PATHS).encode()).decode())
    source = source.replace('%EXCLUDED%', base64.b64encode(json.dumps(EXCLUDED).encode()).decode()).replace('%OLD%', OLD)
    return remote_json(client, source)


def backup(client, out):
    expected = manifest(client)
    archive = out / 'ARL-PRODUCAO-ANTES.tar.gz'
    command = 'tar -czf - -C ' + shlex.quote(HOME) + ' ' + ' '.join('--exclude=' + shlex.quote(path) for path in EXCLUDED) + ' ' + ' '.join(map(shlex.quote, PATHS))
    _, stdout, stderr = client.exec_command(command, timeout=180)
    with archive.open('xb') as stream:
        for block in iter(lambda: stdout.read(1024 * 1024), b''):
            stream.write(block)
    stderr.read()
    check(stdout.channel.recv_exit_status() == 0, 'TAR_STREAM_FAILED')
    seen = set()
    with tarfile.open(archive, 'r:gz') as tar:
        for member in tar:
            if member.isdir():
                continue
            key = member.name.rstrip('/')
            check(key in expected and key not in seen, 'ARCHIVE_SCOPE_MISMATCH')
            value = expected[key]
            if member.issym():
                check(value['type'] == 'link' and member.linkname == value['target'], 'ARCHIVE_LINK_MISMATCH')
            else:
                check(member.isfile() and value['type'] == 'file' and member.size == value['size'], 'ARCHIVE_FILE_MISMATCH')
                digest = hashlib.sha256()
                with tar.extractfile(member) as stream:
                    for block in iter(lambda: stream.read(1024 * 1024), b''):
                        digest.update(block)
                check(digest.hexdigest() == value['sha256'], 'ARCHIVE_HASH_MISMATCH')
            seen.add(key)
    check(seen == set(expected), 'ARCHIVE_FILES_MISSING')
    check(manifest(client) == expected, 'BACKUP_SOURCE_CHANGED')
    record = {'release': PREVIOUS, 'archive': str(archive), 'sha256': sha_file(archive),
              'all_files_verified': True, 'entries': expected, 'excluded_volatile_paths': EXCLUDED}
    save(out / 'BACKUP-PRODUCAO-VERIFICADO.json', record)
    print('PASS: backup de código/privados direto no PC; arquivos=' + str(len(seen)))


def sql_backup(client, out):
    # mysqldump uses an environment credential, never an argument. Output goes only to SSH stdout.
    source = r'''
require '%OLD%/vendor/autoload.php';
$env=Dotenv\Dotenv::createArrayBacked('/home/arlinfocg/arl-private')->load();
$db=$env['DB_DATABASE']??'';
if(!preg_match('/arl/i',$db)||preg_match('/terra|horas/i',$db)||($env['DB_CONNECTION']??'mysql')!=='mysql')exit(41);
$binary=trim((string)shell_exec('command -v mysqldump'));if(!is_executable($binary))exit(42);
$command=[$binary,'--single-transaction','--quick','--skip-lock-tables','--no-tablespaces','--hex-blob','--default-character-set=utf8mb4',
 '--host='.($env['DB_HOST']??'127.0.0.1'),'--port='.($env['DB_PORT']??'3306'),'--user='.($env['DB_USERNAME']??''),$db];
$process=proc_open($command,[0=>['pipe','r'],1=>STDOUT,2=>['pipe','w']],$pipes,null,['MYSQL_PWD'=>$env['DB_PASSWORD']??'','PATH'=>getenv('PATH')]);
if(!is_resource($process))exit(43);fclose($pipes[0]);stream_get_contents($pipes[2]);fclose($pipes[2]);exit(proc_close($process));
'''.replace('%OLD%', OLD)
    _, stdout, stderr = client.exec_command(php_command(source), timeout=180)
    path = out / 'ARL-BANCO-OFICIAL-SOMENTE-LEITURA.sql'
    with path.open('xb') as stream:
        for block in iter(lambda: stdout.read(1024 * 1024), b''):
            stream.write(block)
    stderr.read()
    check(stdout.channel.recv_exit_status() == 0, 'READONLY_SQL_EXPORT_FAILED')
    with path.open('rb') as stream:
        start = stream.read(4096)
        stream.seek(max(0, path.stat().st_size - 8192))
        end = stream.read()
    check(b'Dump' in start and b'Dump completed' in end and path.stat().st_size > 10000, 'SQL_COMPLETION_NOT_CONFIRMED')
    save(out / 'BACKUP-SQL-VERIFICADO.json', {'path': str(path), 'sha256': sha_file(path), 'bytes': path.stat().st_size,
         'export_only': True, 'restore_or_import': False, 'server_archive_created': False})
    print('PASS: SQL exportado somente para o PC; nenhuma importação/migration.')


def baseline(client, out):
    sftp = client.open_sftp()
    check(sftp.normalize(HOME + '/arl-current-e90f11f') == OLD, 'ACTIVE_RELEASE_CHANGED')
    result = {'release': PREVIOUS, 'root': OLD, 'lock': HOME + '/arl-private/deployment.lock', 'aliases': {}}
    for name in ALIASES:
        with sftp.open(HOME + '/www/' + name, 'rb') as stream:
            data = stream.read()
        result['aliases'][name] = {'sha256': hashlib.sha256(data).hexdigest(), 'data': base64.b64encode(data).decode()}
    sftp.close()
    save(out / 'BASELINE-ALIASES.json', result)
    return result


def publish(client, out, report):
    old_backup = json.loads((out / 'BACKUP-PRODUCAO-VERIFICADO.json').read_text(encoding='utf-8'))
    check(old_backup['all_files_verified'] and sha_file(old_backup['archive']) == old_backup['sha256'], 'CODE_BACKUP_INVALID')
    sql = json.loads((out / 'BACKUP-SQL-VERIFICADO.json').read_text(encoding='utf-8'))
    check(sha_file(sql['path']) == sql['sha256'] and sql['export_only'], 'SQL_BACKUP_INVALID')
    base = baseline(client, out)
    for name in ALIASES:
        check(base['aliases'][name]['sha256'] == old_backup['entries']['www/' + name]['sha256'], 'BACKED_UP_ALIAS_CHANGED')
    config = {'owner_authorized': True, 'release': report['release'], 'previous_release': PREVIOUS, 'baseline': base,
              'bytes': report['bytes'], 'sha256': report['sha256'], 'mode': 'publish'}
    source = (ROOT / 'deploy/publish-laragon-final.php').read_text(encoding='utf-8').removeprefix('<?php')
    config_value = base64.b64encode(json.dumps(config).encode()).decode()
    stdin, stdout, stderr = client.exec_command('ARL_EIGHT_CONFIG=' + config_value + ' ' + php_command(source), timeout=180)
    events = []
    try:
        for line in iter(stdout.readline, ''):
            event = json.loads(line)
            events.append(event)
            save(out / 'RESULTADO-PUBLICACAO.json', events)
            if event['event'] == 'READY_UPLOAD':
                with open(report['package'], 'rb') as stream:
                    for block in iter(lambda: stream.read(49152), b''):
                        stdin.write(base64.b64encode(block).decode() + '\n')
                stdin.write('END_PACKAGE\n'); stdin.flush()
            if event['event'] == 'ROLLBACK_BASELINE':
                observed = event['baseline']
                check(observed['old'] == OLD and observed['release'] == report['release'] and observed['lock'] == base['lock'], 'BASELINE_CHANGED')
                for name in ALIASES:
                    check(base['aliases'][name]['sha256'] in observed['accepted'][name], 'ALIAS_CHANGED')
                stdin.write('BASELINE_VERIFIED\n'); stdin.flush()
            print('ARL: ' + event['event'], flush=True)
        stderr.read()
        check(stdout.channel.recv_exit_status() == 0 and any(e['event'] == 'PUBLISHED' for e in events), 'PUBLICATION_BLOCKED')
    finally:
        stdin.close()


def cleanup(client, out, report):
    events = json.loads((out / 'RESULTADO-PUBLICACAO.json').read_text(encoding='utf-8'))
    check(any(e['event'] == 'PUBLISHED' and e['release'] == report['release'] for e in events), 'SUCCESSFUL_PUBLICATION_REQUIRED')
    record = json.loads((out / 'BACKUP-PRODUCAO-VERIFICADO.json').read_text(encoding='utf-8'))
    check(record['all_files_verified'] and sha_file(record['archive']) == record['sha256'], 'LOCAL_ARCHIVE_CHANGED')
    entries = {name: value for name, value in record['entries'].items() if name.startswith(OLD_BASE + '/')}
    config = {'owner_authorized': True, 'local_archive_verified': True, 'archive_sha256': record['sha256'],
              'current_release': report['release'], 'entries': entries}
    # Large manifests go through stdin, not shell arguments or files on the server.
    source = "$cfgLine=fgets(STDIN);putenv('ARL_CLEAN_CONFIG='.trim($cfgLine));" + (ROOT / 'deploy/clean-retired-arl-release.php').read_text(encoding='utf-8').removeprefix('<?php').replace('declare(strict_types=1);', '')
    stdin, stdout, stderr = client.exec_command(php_command(source), timeout=180)
    stdin.write(base64.b64encode(json.dumps(config).encode()).decode() + '\n'); stdin.flush()
    data = stdout.read(); stderr.read()
    result = json.loads(data)
    save(out / 'RESULTADO-LIMPEZA-POS-PUBLICACAO.json', result)
    check(stdout.channel.recv_exit_status() == 0 and result['event'] == 'RETIRED_RELEASE_REMOVED', 'RETIRED_CLEANUP_BLOCKED')
    print('PASS: release antiga removida após backup local conferido; TERRAPLAN/privados intactos.')


def organize_backups(client, out, report):
    events = json.loads((out / 'RESULTADO-PUBLICACAO.json').read_text(encoding='utf-8'))
    check(any(e['event'] == 'PUBLISHED' and e['release'] == report['release'] for e in events), 'SUCCESSFUL_PUBLICATION_REQUIRED')
    copies = json.loads((out / 'BACKUPS-ANTERIORES-VERIFICADOS.json').read_text(encoding='utf-8'))
    check(len(copies) == 4, 'FOUR_VERIFIED_BACKUPS_REQUIRED')
    expected = {}
    for copy in copies:
        check(copy['zip_crc'] == 'PASS' and copy['all_payload_hashes'] == 'PASS' and sha_file(copy['local']) == copy['sha256'], 'LOCAL_BACKUP_CHANGED')
        name = pathlib.PurePosixPath(copy['remote']).name
        check(copy['remote'] == 'arl-private/storage/app/private/backups/' + name, 'UNEXPECTED_BACKUP_PATH')
        expected[name] = copy['sha256']
    source = (ROOT / 'deploy/organize-automatic-backups.php').read_text(encoding='utf-8').removeprefix('<?php')
    stdin, stdout, stderr = client.exec_command(php_command(source), timeout=180)
    stdin.write(json.dumps(expected)); stdin.flush(); stdin.channel.shutdown_write()
    data = stdout.read(); stderr.read()
    result = json.loads(data)
    save(out / 'RESULTADO-BACKUPARL.json', result)
    check(stdout.channel.recv_exit_status() == 0 and result['status'] == 'BACKUPARL_READY', 'BACKUP_ORGANIZATION_BLOCKED')
    print('PASS: quatro backups preservados em BACKUPARL; banco e TERRAPLAN intactos.')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('mode', choices=['backup', 'publish', 'validate', 'cleanup', 'organize-backups'])
    parser.add_argument('--backup-dir', required=True)
    parser.add_argument('--report')
    parser.add_argument('--authorize-publication', action='store_true')
    args = parser.parse_args()
    out = pathlib.Path(args.backup_dir).resolve()
    check(out.parent == BACKUPS.resolve() and re.fullmatch(r'01 - \d{2}-\d{2}-\d{2} - \d{2}-\d{2}', out.name) and out.is_dir(), 'LOCAL_BACKUP_PATH_INVALID')
    report = None
    if args.report:
        report = json.loads(pathlib.Path(args.report).read_text(encoding='utf-8'))
        check(re.fullmatch('[a-f0-9]{40}', report['release']) and report['schema_changes'] is False and report['previous_release'] == PREVIOUS, 'PACKAGE_METADATA_INVALID')
        check(sha_file(report['package']) == report['sha256'], 'PACKAGE_HASH_INVALID')
    if args.mode == 'validate':
        check(report is not None, 'PACKAGE_REPORT_REQUIRED')
        print('PASS: pacote conferido; nenhuma conexão SSH.'); return
    check(args.mode not in ('publish', 'cleanup', 'organize-backups') or args.authorize_publication, 'OWNER_AUTHORIZATION_REQUIRED')
    client = connect()
    try:
        if args.mode == 'backup':
            backup(client, out); sql_backup(client, out); baseline(client, out)
        elif args.mode == 'publish':
            check(report is not None, 'PACKAGE_REPORT_REQUIRED')
            publish(client, out, report)
        elif args.mode == 'organize-backups':
            check(report is not None, 'PACKAGE_REPORT_REQUIRED')
            organize_backups(client, out, report)
        else:
            check(report is not None, 'PACKAGE_REPORT_REQUIRED')
            cleanup(client, out, report)
    finally:
        client.close()


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        # Avoid printing raw exceptions from SSH, dump tools or environment parsing.
        code = str(error) if isinstance(error, RuntimeError) and re.fullmatch('[A-Z0-9_]+', str(error)) else type(error).__name__
        print('BLOCKED: ' + code, file=sys.stderr)
        sys.exit(1)
