param([Parameter(Mandatory=$true)][string]$PacoteRelatorio,[switch]$AutorizarPublicacao,[switch]$ValidarLocal,[switch]$Reverter,[string]$Resultado,[string]$BackupAliasesExistente)
$ErrorActionPreference='Stop'
$arlReport=Get-Content -LiteralPath $PacoteRelatorio -Raw|ConvertFrom-Json
$arlPackage=[IO.Path]::GetFullPath($arlReport.package)
if((Get-FileHash -LiteralPath $arlPackage).Hash.ToLowerInvariant() -ne $arlReport.sha256){throw 'Pacote divergente.'}
if($arlReport.release -notmatch '^[a-f0-9]{40}$' -or $arlReport.schema_changes -ne $false){throw 'Release/schema invalido.'}
$arlCode=[IO.File]::ReadAllText((Join-Path $PSScriptRoot 'publish-eight-improvements.php'))
$arlConfig=@{owner_authorized=[bool]$AutorizarPublicacao;release=$arlReport.release;bytes=[int64]$arlReport.bytes;sha256=$arlReport.sha256;mode='publish'}
$arlBackupRoot='C:\Users\Allan\OneDrive\Programacao APP\App Arl Informatica\Backups'
$arlStamp=(Get-Date -Format 'yyyyMMdd-HHmmss')+'-'+[Guid]::NewGuid().ToString('N').Substring(0,8)
$arlResultPath=Join-Path $arlBackupRoot ('ARL-Oito-Publicacao-'+$arlStamp+'.json')
$arlEvents=[Collections.Generic.List[object]]::new()
function Save-ArlEvents{[IO.File]::WriteAllText($arlResultPath,(@($arlEvents.ToArray())|ConvertTo-Json -Depth 20),[Text.UTF8Encoding]::new($false))}
if($Reverter){
  if([string]::IsNullOrWhiteSpace($Resultado)){throw 'Rollback exige relatorio.'}
  $arlPrior=@(Get-Content -LiteralPath $Resultado -Raw|ConvertFrom-Json)
  $arlRecord=@($arlPrior|Where-Object event -EQ 'BACKUP_ALIASES')
  if($arlRecord.Count -ne 1){throw 'Backup ausente/ambiguo.'}
  if((Get-FileHash -LiteralPath $arlRecord[0].backup_file).Hash.ToLowerInvariant() -ne $arlRecord[0].backup_sha256){throw 'Backup local divergente.'}
  $arlBackup=Get-Content -LiteralPath $arlRecord[0].backup_file -Raw|ConvertFrom-Json
  if($arlBackup.release -ne $arlReport.release){throw 'Backup de outra release.'}
  $arlConfig.mode='rollback';$arlConfig.backup=$arlBackup
}
if($ValidarLocal){Write-Output 'VALIDACAO LOCAL: SHA verificado, sem SSH ou alteracoes remotas.';return}
if(-not $AutorizarPublicacao){throw 'Autorizacao expressa obrigatoria; nao usar -AutorizarPublicacao antes da confirmacao.'}
if(-not (Test-Path -LiteralPath $arlBackupRoot -PathType Container)){throw 'Pasta externa de backup ausente.'}
if(-not $arlCode.StartsWith('<?php')){throw 'Payload PHP invalido.'}
$arlPayload=[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($arlCode.Substring(5)))
$arlConfigEncoded=[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes(($arlConfig|ConvertTo-Json -Depth 25 -Compress)))
$arlRemote=[string]::Join([char]10,@('IFS= read -r ARL_EIGHT_PAYLOAD',$arlPayload,'export ARL_EIGHT_PAYLOAD',('export ARL_EIGHT_CONFIG='+$arlConfigEncoded),'exec /usr/bin/php82 -d display_errors=0 -d log_errors=0 -d memory_limit=512M -r ''eval(base64_decode(getenv("ARL_EIGHT_PAYLOAD")));''',''))
Write-Host 'Uma sessao SSH. Digite a senha somente no prompt nativo.'
Write-Host 'Codigo/assets apenas; sem migration, restore SQL ou alteracao de env/storage/uploads. Rollback e90.'
$arlPsi=[Diagnostics.ProcessStartInfo]::new();$arlPsi.FileName=(Get-Command ssh.exe).Source
$arlPsi.Arguments='-o StrictHostKeyChecking=yes -o UpdateHostKeys=no -o ConnectTimeout=10 -T arlinfocg@web1f08.kinghost.net "bash -s"'
$arlPsi.UseShellExecute=$false;$arlPsi.RedirectStandardInput=$true;$arlPsi.RedirectStandardOutput=$true
$arlProcess=[Diagnostics.Process]::Start($arlPsi)
try{
  $arlProcess.StandardInput.Write($arlRemote);$arlProcess.StandardInput.Flush()
  while($null -ne ($arlLine=$arlProcess.StandardOutput.ReadLine())){
    if([string]::IsNullOrWhiteSpace($arlLine)){continue}
    try{$arlEvent=$arlLine|ConvertFrom-Json}catch{throw 'Retorno remoto invalido; nao exibir dados potencialmente privados.'}
    if(-not $arlEvent.event){throw 'Evento remoto invalido.'}
    if($arlEvent.event -eq 'READY_UPLOAD'){
      $arlInput=[IO.File]::OpenRead($arlPackage);$arlBuffer=[byte[]]::new(49152)
      try{while(($arlCount=$arlInput.Read($arlBuffer,0,$arlBuffer.Length)) -gt 0){$arlProcess.StandardInput.WriteLine([Convert]::ToBase64String($arlBuffer,0,$arlCount))}}finally{$arlInput.Dispose()}
      $arlProcess.StandardInput.WriteLine('END_PACKAGE');$arlProcess.StandardInput.Flush()
    }
    if($arlEvent.event -eq 'BACKUP_ALIASES'){
      if(-not [string]::IsNullOrWhiteSpace($BackupAliasesExistente)){
        $arlBackupFile=[IO.Path]::GetFullPath($BackupAliasesExistente)
        $arlVerified=Get-Content -LiteralPath $arlBackupFile -Raw|ConvertFrom-Json
        foreach($arlField in @('release','old','new','lock')){if($arlVerified.$arlField -ne $arlEvent.backup.$arlField){throw 'Backup existente de outro estado.'}}
        foreach($arlAlias in $arlEvent.backup.aliases.PSObject.Properties){
          $arlExisting=$arlVerified.aliases.($arlAlias.Name)
          if($null -eq $arlExisting -or $arlExisting.sha256 -ne $arlAlias.Value.sha256 -or $arlExisting.data -ne $arlAlias.Value.data){throw 'Alias diverge do backup existente; nao criar novo backup.'}
        }
      }else{
      $arlBackupBytes=[Text.Encoding]::UTF8.GetBytes(($arlEvent.backup|ConvertTo-Json -Depth 20))
      $arlBackupFile=Join-Path $arlBackupRoot ('ARL-Oito-Aliases-e90-'+$arlStamp+'.json')
      $arlStream=[IO.File]::Open($arlBackupFile,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None)
      try{$arlStream.Write($arlBackupBytes,0,$arlBackupBytes.Length);$arlStream.Flush($true)}finally{$arlStream.Dispose()}
      }
      $arlBackupHash=(Get-FileHash -LiteralPath $arlBackupFile).Hash.ToLowerInvariant()
      $arlVerified=Get-Content -LiteralPath $arlBackupFile -Raw|ConvertFrom-Json
      foreach($arlAlias in $arlVerified.aliases.PSObject.Properties){
        $arlHash=[Security.Cryptography.SHA256]::Create()
        try{$arlActual=[BitConverter]::ToString($arlHash.ComputeHash([Convert]::FromBase64String($arlAlias.Value.data))).Replace('-','').ToLowerInvariant()}finally{$arlHash.Dispose()}
        if($arlActual -ne $arlAlias.Value.sha256){throw 'Backup de alias corrompido.'}
      }
      $arlEvent.PSObject.Properties.Remove('backup')
      $arlEvent|Add-Member -NotePropertyName backup_file -NotePropertyValue $arlBackupFile
      $arlEvent|Add-Member -NotePropertyName backup_sha256 -NotePropertyValue $arlBackupHash
      $arlEvents.Add($arlEvent);Save-ArlEvents
      $arlProcess.StandardInput.WriteLine('BACKUP_VERIFIED');$arlProcess.StandardInput.Flush()
      Write-Host 'Backup de aliases e90 validado no OneDrive (existente quando informado).'
    }else{$arlEvents.Add($arlEvent);Save-ArlEvents}
    Write-Host ('ARL: '+$arlEvent.event)
  }
}finally{$arlProcess.StandardInput.Close();$arlProcess.WaitForExit();Save-ArlEvents}
Write-Output ('RELATORIO='+$arlResultPath)
if($arlProcess.ExitCode -ne 0 -or -not @($arlEvents|Where-Object {$_.event -in @('PUBLISHED','REVERTED_E90')}).Count){throw 'Bloqueado. Consultar relatorio; nao repetir migration nem restaurar SQL.'}
