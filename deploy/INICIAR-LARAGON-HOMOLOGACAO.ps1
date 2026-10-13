param([int]$Port = 8020, [switch]$PrepareOnly)
$ErrorActionPreference = 'Stop'
$taskRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$taskPhp = 'C:\laragon\bin\php\php-8.3.33-Win32-vs16-x64\php.exe'
if (!(Test-Path -LiteralPath $taskPhp)) { throw 'PHP do Laragon 8.3 não encontrado.' }
if (!(Test-Path -LiteralPath (Join-Path $taskRoot 'public\build\manifest.json'))) { throw 'Execute npm run build antes de iniciar.' }
$taskDatabase = Join-Path $taskRoot 'database\laragon-homologacao-20261013.sqlite'
$taskPrivate = Join-Path $taskRoot 'storage\framework\testing\laragon-demo-private'
$taskConfig = Join-Path $taskPrivate 'config-cache-nao-utilizado.php'
if (Test-Path -LiteralPath $taskConfig) { throw 'Cache inesperado; inicialização bloqueada.' }
$env:APP_ENV = 'testing'
$env:APP_DEBUG = 'false'
$env:APP_KEY = 'base64:7n9S6t2H7Hn23xH5H3YgNnLh6dI0vY7Hc7Jt6nD6m1M='
$env:APP_URL = "http://127.0.0.1:$Port"
$env:APP_CONFIG_CACHE = $taskConfig
$env:DB_URL = ''
$env:DB_CONNECTION = 'sqlite'
$env:DB_DATABASE = $taskDatabase
$env:PRIVATE_STORAGE_PATH = $taskPrivate
$env:SESSION_DRIVER = 'file'
$env:CACHE_STORE = 'array'
$env:QUEUE_CONNECTION = 'sync'
$env:MISTRAL_EXPENSE_PHOTO_ENABLED = 'false'
$env:MISTRAL_API_KEY = ''
$env:GEMINI_EXPENSE_PHOTO_ENABLED = 'false'
$env:GEMINI_API_KEY = ''
New-Item -ItemType Directory -Path $taskPrivate -Force | Out-Null
$taskNew = !(Test-Path -LiteralPath $taskDatabase)
if ($taskNew) { [IO.File]::WriteAllBytes($taskDatabase, [byte[]]@()) }
Push-Location $taskRoot
try {
  & $taskPhp artisan migrate --force
  if ($LASTEXITCODE) { throw 'Migrações da homologação falharam.' }
  if ($taskNew) {
    & $taskPhp artisan db:seed --class=DatabaseSeeder --force
    if ($LASTEXITCODE) { throw 'Configuração fictícia falhou.' }
    & $taskPhp artisan db:seed --class=E2ESeeder --force
    if ($LASTEXITCODE) { throw 'Contas fictícias falharam.' }
  }
  Write-Host "Homologação isolada: http://127.0.0.1:$Port"
  Write-Host 'Conta fictícia: e2e.master / E2e-Segura-2026!'
  Write-Host 'Preserva .env, banco de uso, dados anteriores de homologação e produção. Ctrl+C encerra.'
  if (!$PrepareOnly) {
    Set-Location (Join-Path $taskRoot 'public')
    & $taskPhp -d opcache.enable_cli=0 -S "127.0.0.1:$Port" (Join-Path $taskRoot 'vendor\laravel\framework\src\Illuminate\Foundation\resources\server.php')
  }
} finally { Pop-Location }
