<?php

return [
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
