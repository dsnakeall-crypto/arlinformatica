<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // PHP suites validate server responses without requiring compiled assets.
        // Playwright validates the real Vite build, including the login page.
        $this->withoutVite();
    }

    public function createApplication()
    {
        $app = parent::createApplication();
        $connection = DB::connection();
        if (in_array($connection->getDriverName(), ['mysql', 'mariadb'], true)
            && ! preg_match('/(?:^|_)test(?:_|$)/i', $connection->getDatabaseName())) {
            throw new \RuntimeException('Testes MySQL exigem um banco dedicado com test no nome. Banco de uso bloqueado.');
        }
        config(['filesystems.disks.local.root' => storage_path('framework/testing/phpunit-private')]);
        Storage::forgetDisk('local');

        return $app;
    }
}
