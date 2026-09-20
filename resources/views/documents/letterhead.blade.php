<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><style>
@page{margin:36mm 15mm 28mm 15mm}.official-letterhead{position:fixed;top:-36mm;left:-15mm;width:210mm;height:297mm;z-index:-1}.document-usable-area{margin:0;padding:0;width:180mm}
</style>@yield('document-head')</head><body><img class="official-letterhead" src="{{ \App\Services\OfficialLetterhead::path() }}" alt=""><main class="document-usable-area">@yield('content')</main></body></html>
