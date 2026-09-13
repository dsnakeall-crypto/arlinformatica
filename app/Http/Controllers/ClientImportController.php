<?php

namespace App\Http\Controllers;

use App\Services\ClientCsvImport;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClientImportController extends Controller
{
    public function store(Request $request, ClientCsvImport $import): JsonResponse
    {
        $request->validate(['file' => 'required|file|extensions:csv|mimetypes:text/plain,text/csv,application/csv,application/vnd.ms-excel|max:2048'], [
            'file.extensions' => 'Selecione um arquivo .csv.',
            'file.mimetypes' => 'O arquivo deve conter texto CSV.',
            'file.max' => 'O CSV deve ter no máximo 2 MB.',
        ]);

        return response()->json($import->run($request));
    }
}
