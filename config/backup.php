<?php

return [
    'disk' => env('BACKUP_DISK', 'local'),
    'directory' => 'backups',
    'format_version' => 1,
    'max_upload_kb' => (int) env('BACKUP_MAX_UPLOAD_KB', 512000),
    'automatic' => env('BACKUP_AUTOMATIC', false),
    'frequency' => env('BACKUP_FREQUENCY', 'daily'),
    'retention' => (int) env('BACKUP_RETENTION', 7),
];
