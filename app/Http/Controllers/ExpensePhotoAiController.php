<?php

namespace App\Http\Controllers;

use App\Services\ExpensePhotoAi;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExpensePhotoAiController extends Controller
{
    public function configuration(ExpensePhotoAi $ai): JsonResponse
    {
        return response()->json($ai->configuration())->header('Cache-Control', 'no-store, private');
    }

    public function read(Request $request, ExpensePhotoAi $ai): JsonResponse
    {
        $data = $request->validate(['photo' => 'required|file|mimes:jpg,jpeg,png,webp|max:10240', 'rotation' => 'required|integer|in:0,90,180,270', 'request_key' => 'required|uuid', 'consent' => 'required|accepted']);

        return response()->json($ai->read($request->file('photo'), (int) $data['rotation'], $data['request_key'], $request->user()->id))->header('Cache-Control', 'no-store, private');
    }
}
