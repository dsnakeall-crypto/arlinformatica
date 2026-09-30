<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AppBackgroundTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
        Storage::fake('local');
    }

    public function test_jpg_png_and_webp_are_accepted_and_stored_as_jpg(): void
    {
        $admin = $this->user('Administrador', 'background-formats');

        foreach (['jpg', 'png', 'webp'] as $format) {
            $response = $this->actingAs($admin)->post('/api/settings/app-background', [
                'image' => $this->image($format, 640, 360),
                'soften' => true,
            ], ['Accept' => 'application/json']);

            $response->assertCreated()->assertJsonPath('configured', true);
            $path = DB::table('settings')->where('key', 'app_background')->value('value');
            $this->assertStringEndsWith('.jpg', $path);
            Storage::disk('local')->assertExists($path);
            $this->assertSame('image/jpeg', getimagesizefromstring(Storage::disk('local')->get($path))['mime']);
        }
    }

    public function test_svg_and_a_fake_image_are_rejected(): void
    {
        $admin = $this->user('Administrador', 'background-invalid');
        $svg = UploadedFile::fake()->createWithContent('fundo.svg', '<svg xmlns="http://www.w3.org/2000/svg"></svg>');
        $fake = UploadedFile::fake()->createWithContent('fundo.jpg', 'isto não é uma imagem');

        $this->actingAs($admin)->post('/api/settings/app-background', [
            'image' => $svg,
            'soften' => true,
        ], ['Accept' => 'application/json'])->assertUnprocessable()->assertJsonValidationErrors('image');

        $this->actingAs($admin)->post('/api/settings/app-background', [
            'image' => $fake,
            'soften' => true,
        ], ['Accept' => 'application/json'])->assertUnprocessable()->assertJsonValidationErrors('image');
    }

    public function test_upload_larger_than_five_megabytes_has_the_expected_message(): void
    {
        $admin = $this->user('Administrador', 'background-large-file');

        $this->actingAs($admin)->post('/api/settings/app-background', [
            'image' => UploadedFile::fake()->create('fundo.jpg', 5121, 'image/jpeg'),
            'soften' => true,
        ], ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonPath('errors.image.0', 'A imagem deve ter no máximo 5 MB.');
    }

    public function test_large_image_is_reduced_to_at_most_1920_pixels_and_saved_as_jpg(): void
    {
        $admin = $this->user('Master', 'background-resize');

        $this->actingAs($admin)->post('/api/settings/app-background', [
            'image' => $this->image('png', 2400, 1200),
            'soften' => false,
        ], ['Accept' => 'application/json'])->assertCreated()->assertJsonPath('soften', false);

        $path = DB::table('settings')->where('key', 'app_background')->value('value');
        $info = getimagesizefromstring(Storage::disk('local')->get($path));
        $this->assertSame(1920, $info[0]);
        $this->assertSame(960, $info[1]);
        $this->assertSame('image/jpeg', $info['mime']);
    }

    public function test_restoring_original_deletes_the_private_file_and_settings(): void
    {
        $admin = $this->user('Administrador', 'background-reset');
        $this->actingAs($admin)->post('/api/settings/app-background', [
            'image' => $this->image('jpg', 640, 360),
            'soften' => true,
        ], ['Accept' => 'application/json'])->assertCreated();
        $path = DB::table('settings')->where('key', 'app_background')->value('value');

        $this->actingAs($admin)->deleteJson('/api/settings/app-background')
            ->assertOk()
            ->assertJsonPath('configured', false)
            ->assertJsonPath('soften', true);

        Storage::disk('local')->assertMissing($path);
        $this->assertDatabaseMissing('settings', ['key' => 'app_background']);
        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $admin->id,
            'action' => 'settings.app_background_removed',
        ]);
    }

    public function test_only_master_and_administrator_can_change_the_background(): void
    {
        $employee = $this->user('Funcionário', 'background-employee');

        $this->post('/api/settings/app-background', [
            'image' => $this->image('jpg', 320, 180),
            'soften' => true,
        ], ['Accept' => 'application/json'])->assertUnauthorized();

        $this->actingAs($employee)->post('/api/settings/app-background', [
            'image' => $this->image('jpg', 320, 180),
            'soften' => true,
        ], ['Accept' => 'application/json'])->assertForbidden();
    }

    public function test_background_file_route_requires_authentication(): void
    {
        $path = 'company/backgrounds/private.jpg';
        Storage::disk('local')->put($path, 'private-image');
        DB::table('settings')->insert([
            ['key' => 'app_background', 'value' => $path, 'type' => 'private_file', 'created_at' => now(), 'updated_at' => now()],
            ['key' => 'app_background_version', 'value' => 'version-1', 'type' => 'string', 'created_at' => now(), 'updated_at' => now()],
        ]);

        $this->getJson('/api/app-background/file?v=version-1')->assertUnauthorized();

        $this->actingAs($this->user('Funcionário', 'background-viewer'))
            ->get('/api/app-background/file?v=version-1')
            ->assertOk()
            ->assertHeader('Content-Type', 'image/jpeg');
    }

    private function image(string $format, int $width, int $height): UploadedFile
    {
        $path = tempnam(sys_get_temp_dir(), 'app-background-');
        $image = imagecreatetruecolor($width, $height);
        $color = imagecolorallocate($image, 168, 42, 68);
        imagefill($image, 0, 0, $color);
        match ($format) {
            'jpg' => imagejpeg($image, $path, 90),
            'png' => imagepng($image, $path),
            'webp' => imagewebp($image, $path, 90),
        };
        imagedestroy($image);

        return new UploadedFile($path, "fundo.$format", match ($format) {
            'jpg' => 'image/jpeg',
            'png' => 'image/png',
            'webp' => 'image/webp',
        }, null, true);
    }

    private function user(string $role, string $login): User
    {
        return User::create([
            'role_id' => Role::where('name', $role)->value('id'),
            'name' => $role,
            'login' => $login,
            'password' => 'Senha#Forte123',
            'active' => true,
        ]);
    }
}
