<?php
// Pure helpers in a fresh local fixture. No SSH, hosting or database access.
declare(strict_types=1);
define('ARL_DEPLOY_LIBRARY_ONLY',true);
require __DIR__.'/publish-eight-improvements.php';
$dir=dirname(__DIR__).'/output/releases/simulation-'.bin2hex(random_bytes(6));
arlCheck(mkdir($dir,0700,true),'FIXTURE_FAILED');$dir=realpath($dir);
foreach(['old','new','former','www'] as $name)arlCheck(mkdir($dir.'/'.$name,0700),'FIXTURE_DIRECTORY_FAILED');
$old=realpath($dir.'/old');$new=realpath($dir.'/new');$former=realpath($dir.'/former');$www=realpath($dir.'/www');$pointer=$dir.'/current';
arlPointer($pointer,$old);
$original=['index.php'=>"<?php\n".arlShared($pointer,[$former,$old],$old,'e90f11fea20839e573df7a40d67489301dbcaad7',$old)."echo 'old';\n",'cron-scheduler.php'=>"<?php\n".arlShared($pointer,[$former,$old],$old,'e90f11fea20839e573df7a40d67489301dbcaad7',$old)."http_response_code(403);\n",'sw.js'=>'old-sw','manifest.json'=>'old-manifest'];
foreach($original as $name=>$bytes)arlCheck(file_put_contents($www.'/'.$name,$bytes)===strlen($bytes),'FIXTURE_WRITE_FAILED');
$before=arlShared($pointer,[$former,$old],$old,'e90f11fea20839e573df7a40d67489301dbcaad7',$old);
$after=arlShared($pointer,[$former,$old,$new],$new,str_repeat('a',40),$old);
foreach(['index.php','cron-scheduler.php'] as $name){arlCheck(substr_count($original[$name],$before)===1,'LAUNCHER_MATCH_FAILED');$next=str_replace($before,$after,$original[$name]);token_get_all($next,TOKEN_PARSE);arlAtomic($www.'/'.$name,$next);}
arlPointer($pointer,$new);arlCheck(realpath($pointer)===$new,'ACTIVATION_FAILED');
arlPointer($pointer,$old);foreach($original as $name=>$bytes)arlAtomic($www.'/'.$name,$bytes);
foreach($original as $name=>$bytes)arlCheck(hash_file('sha256',$www.'/'.$name)===hash('sha256',$bytes),'ROLLBACK_HASH_FAILED');
arlCheck(realpath($pointer)===$old,'ROLLBACK_POINTER_FAILED');
try{arlAtomic($pointer,'unsafe');throw new RuntimeException('UNSAFE_ALIAS_ACCEPTED');}catch(RuntimeException $e){arlCheck($e->getMessage()==='UNSAFE_ALIAS','SYMLINK_GUARD_FAILED');}
echo "PASS: launcher syntax, allowlist extension, atomic activation, e90 rollback hashes and symlink guard.\n";
echo "Fixture: ".$dir."\n";
