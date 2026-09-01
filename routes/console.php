<?php

use Illuminate\Support\Facades\Schedule;

Schedule::command('notifications:post-sale')->hourly()->withoutOverlapping();
