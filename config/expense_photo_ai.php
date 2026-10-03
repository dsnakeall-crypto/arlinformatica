<?php

return [
    'provider' => env('EXPENSE_PHOTO_AI_PROVIDER', 'mistral'),
    'mistral_enabled' => env('MISTRAL_EXPENSE_PHOTO_ENABLED', false),
    'mistral_api_key' => env('MISTRAL_API_KEY', ''),
    'mistral_model' => 'mistral-ocr-4-1',
    // Conservative estimate: USD 4 OCR + USD 5 annotation per 1,000 pages.
    'mistral_page_micro_usd' => 9000,
    'enabled' => env('GEMINI_EXPENSE_PHOTO_ENABLED', false),
    'api_key' => env('GEMINI_API_KEY', ''),
    'model' => env('GEMINI_EXPENSE_PHOTO_MODEL', 'gemini-3.1-pro-preview'),
    'monthly_reads' => (int) env('GEMINI_EXPENSE_PHOTO_MONTHLY_READS', 20),
    // Microdollars; 1,000,000 = USD 1. An application ceiling, not a Google billing cap.
    'monthly_micro_usd' => (int) env('GEMINI_EXPENSE_PHOTO_MONTHLY_MICRO_USD', 1000000),
    'max_output_tokens' => 4096,
    'max_input_tokens' => 16000,
    'prices' => [
        'gemini-3.1-pro-preview' => ['input' => 2, 'output' => 12],
        'gemini-2.5-flash' => ['input' => 0.3, 'output' => 2.5],
    ],
];
