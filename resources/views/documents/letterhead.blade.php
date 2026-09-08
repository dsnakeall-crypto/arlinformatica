<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><style>
@page{margin:0;size:A4 portrait}html,body{margin:0;padding:0}.official-letterhead{position:fixed;top:0;left:0;width:210mm;height:auto;z-index:-1000}.document-usable-area{margin:68mm 15mm 34mm;width:180mm}
</style>@yield('document-head')</head><body><img class="official-letterhead" src="{{ \App\Services\OfficialLetterhead::path() }}" alt=""><main class="document-usable-area">@yield('content')</main></body></html>
