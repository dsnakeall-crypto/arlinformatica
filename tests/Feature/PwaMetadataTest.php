<?php

namespace Tests\Feature;

use Tests\TestCase;

class PwaMetadataTest extends TestCase
{
    public function test_manifest_is_valid_and_uses_installable_relative_metadata(): void
    {
        $manifest = json_decode(
            file_get_contents(public_path('manifest.webmanifest')),
            true,
            512,
            JSON_THROW_ON_ERROR,
        );

        $this->assertSame('ARL Informática', $manifest['name']);
        $this->assertSame('ARL Informática', $manifest['short_name']);
        $this->assertSame('./', $manifest['id']);
        $this->assertSame('./', $manifest['start_url']);
        $this->assertSame('./', $manifest['scope']);
        $this->assertSame('standalone', $manifest['display']);
        $this->assertSame('#000000', $manifest['theme_color']);
        $this->assertSame('#000000', $manifest['background_color']);

        foreach ($manifest['icons'] as $icon) {
            $this->assertStringStartsWith('./', $icon['src']);
            $this->assertFileExists(public_path(substr($icon['src'], 2)));
        }

        $this->assertContains('192x192', array_column($manifest['icons'], 'sizes'));
        $this->assertContains('512x512', array_column($manifest['icons'], 'sizes'));
        $this->assertContains('maskable', array_column($manifest['icons'], 'purpose'));
    }

    public function test_html_exposes_manifest_favicons_and_ios_installation_metadata(): void
    {
        $this->get('/')
            ->assertOk()
            ->assertSee('<link rel="manifest" href="./manifest.webmanifest">', false)
            ->assertSee('rel="apple-touch-icon"', false)
            ->assertSee('href="./arl-assets/icons/icon-180.png"', false)
            ->assertSee('href="./arl-assets/icons/favicon.ico"', false)
            ->assertSee('name="apple-mobile-web-app-capable" content="yes"', false)
            ->assertSee('name="theme-color" content="#000000"', false);
    }
}
