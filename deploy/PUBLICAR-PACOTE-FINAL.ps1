param([Parameter(Mandatory=$true)][string]$PacoteRelatorio,[switch]$AutorizarPublicacao,[switch]$ValidarLocal,[switch]$Reverter,[string]$Resultado)
$ErrorActionPreference='Stop'
$arlReport=Get-Content -LiteralPath $PacoteRelatorio -Raw|ConvertFrom-Json
$arlPackage=[IO.Path]::GetFullPath($arlReport.package)
if((Get-FileHash -LiteralPath $arlPackage).Hash.ToLowerInvariant() -ne $arlReport.sha256){throw 'Pacote divergente.'}
if($arlReport.release -notmatch '^[a-f0-9]{40}$' -or $arlReport.schema_changes -ne $false -or $arlReport.previous_release -ne '9a90223304d404de1dfb867cc109952ca0b99ca5'){throw 'Release/schema/base invalida.'}
$arlPreviousPackage=Join-Path (Split-Path $PSScriptRoot -Parent) 'output/releases/ARL-OITO-MELHORIAS-9a90223304d4.zip'
$arlPreviousAliases='C:/Users/Allan/OneDrive/Programacao APP/App Arl Informatica/Backups/ARL-Oito-Aliases-e90-20261012-151916-2bb077bb.json'
$arlBaselineJson=& php (Join-Path $PSScriptRoot 'previous-release-baseline.php') $arlPreviousPackage $arlPreviousAliases
if($LASTEXITCODE -ne 0){throw 'Artefatos existentes de rollback invalidos.'}
$arlBaseline=$arlBaselineJson|ConvertFrom-Json
$arlConfig=@{owner_authorized=[bool]$AutorizarPublicacao;release=$arlReport.release;previous_release=$arlReport.previous_release;baseline=$arlBaseline;bytes=[int64]$arlReport.bytes;sha256=$arlReport.sha256;mode='publish'}
if($Reverter){
  if([string]::IsNullOrWhiteSpace($Resultado)){throw 'Rollback exige relatorio real.'}
  $arlPrior=@(Get-Content -LiteralPath $Resultado -Raw|ConvertFrom-Json)
  $arlRecord=@($arlPrior|Where-Object event -EQ 'ROLLBACK_BASELINE')
  if($arlRecord.Count -ne 1){throw 'Baseline ausente/ambiguo.'}
  $arlRollback=$arlRecord[0].baseline
  if($arlRollback.release -ne $arlReport.release -or $arlRollback.previous_release -ne $arlBaseline.release -or $arlRollback.old -ne $arlBaseline.root -or $arlRollback.lock -ne $arlBaseline.lock){throw 'Relatorio de outra publicacao.'}
  $arlRollback|Add-Member -NotePropertyName aliases -NotePropertyValue $arlBaseline.aliases
  $arlConfig.mode='rollback';$arlConfig.backup=$arlRollback
}
if($ValidarLocal){Write-Output 'PASS: pacote e quatro aliases anteriores verificados; sem SSH ou novo backup.';return}
if(-not $AutorizarPublicacao){throw 'Autorizacao expressa obrigatoria antes de SSH.'}
$arlCode=[IO.File]::ReadAllText((Join-Path $PSScriptRoot 'publish-final-corrections.php'))
if(-not $arlCode.StartsWith('<?php')){throw 'Payload PHP invalido.'}
$arlPayload=[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($arlCode.Substring(5)))
$arlConfigEncoded=[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes(($arlConfig|ConvertTo-Json -Depth 25 -Compress)))
$arlRemote=[string]::Join([char]10,@('IFS= read -r ARL_EIGHT_PAYLOAD',$arlPayload,'export ARL_EIGHT_PAYLOAD',('export ARL_EIGHT_CONFIG='+$arlConfigEncoded),'exec /usr/bin/php82 -d display_errors=0 -d log_errors=0 -d memory_limit=512M -r ''eval(base64_decode(getenv("ARL_EIGHT_PAYLOAD")));''',''))
$arlStamp=(Get-Date -Format 'yyyyMMdd-HHmmss')+'-'+[Guid]::NewGuid().ToString('N').Substring(0,8)
$arlResultPath=Join-Path (Split-Path $arlPackage -Parent) ('RESULTADO-PACOTE-FINAL-'+$arlStamp+'.json')
$arlEvents=[Collections.Generic.List[object]]::new()
function Save-ArlEvents{[IO.File]::WriteAllText($arlResultPath,(@($arlEvents.ToArray())|ConvertTo-Json -Depth 20),[Text.UTF8Encoding]::new($false))}
Write-Host 'Uma sessao SSH. Digite a senha apenas no prompt nativo. Sem novo backup ou SQL; rollback 9a90223.'
$arlPsi=[Diagnostics.ProcessStartInfo]::new();$arlPsi.FileName=(Get-Command ssh.exe).Source
$arlPsi.Arguments='-o StrictHostKeyChecking=yes -o UpdateHostKeys=no -o ConnectTimeout=10 -T arlinfocg@web1f08.kinghost.net "bash -s"'
$arlPsi.UseShellExecute=$false;$arlPsi.RedirectStandardInput=$true;$arlPsi.RedirectStandardOutput=$true
$arlProcess=[Diagnostics.Process]::Start($arlPsi)
try{
  $arlProcess.StandardInput.Write($arlRemote);$arlProcess.StandardInput.Flush()
  while($null -ne ($arlLine=$arlProcess.StandardOutput.ReadLine())){
    if([string]::IsNullOrWhiteSpace($arlLine)){continue}
    try{$arlEvent=$arlLine|ConvertFrom-Json}catch{throw 'Retorno remoto invalido.'}
    if(-not $arlEvent.event){throw 'Evento remoto invalido.'}
    if($arlEvent.event -eq 'READY_UPLOAD'){
      $arlInput=[IO.File]::OpenRead($arlPackage);$arlBuffer=[byte[]]::new(49152)
      try{while(($arlCount=$arlInput.Read($arlBuffer,0,$arlBuffer.Length)) -gt 0){$arlProcess.StandardInput.WriteLine([Convert]::ToBase64String($arlBuffer,0,$arlCount))}}finally{$arlInput.Dispose()}
      $arlProcess.StandardInput.WriteLine('END_PACKAGE');$arlProcess.StandardInput.Flush()
    }
    $arlEvents.Add($arlEvent);Save-ArlEvents
    if($arlEvent.event -eq 'ROLLBACK_BASELINE'){
      if($arlEvent.baseline.release -ne $arlReport.release -or $arlEvent.baseline.previous_release -ne $arlBaseline.release -or $arlEvent.baseline.old -ne $arlBaseline.root -or $arlEvent.baseline.lock -ne $arlBaseline.lock){throw 'Baseline remoto divergente.'}
      foreach($arlAlias in $arlBaseline.aliases.PSObject.Properties){if($arlAlias.Value.sha256 -notin $arlEvent.baseline.accepted.($arlAlias.Name)){throw 'Alias anterior nao conferido.'}}
      $arlProcess.StandardInput.WriteLine('BASELINE_VERIFIED');$arlProcess.StandardInput.Flush()
    }
    Write-Host ('ARL: '+$arlEvent.event)
  }
}finally{$arlProcess.StandardInput.Close();$arlProcess.WaitForExit();Save-ArlEvents}
Write-Output ('RELATORIO='+$arlResultPath)
if($arlProcess.ExitCode -ne 0 -or -not @($arlEvents|Where-Object {$_.event -in @('PUBLISHED','REVERTED_PREVIOUS')}).Count){throw 'Bloqueado. Conferir relatorio; nao repetir migracao ou restaurar SQL.'}
