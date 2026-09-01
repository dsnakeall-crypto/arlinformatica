<?php

use Illuminate\Support\Facades\Schedule;

Schedule::command('post-sale:check')->hourly()->withoutOverlapping();
