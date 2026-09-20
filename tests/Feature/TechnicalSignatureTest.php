<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use App\Services\SignatureProcessor;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class TechnicalSignatureTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    public function test_processor_preserves_transparency_from_png_source(): void
    {
        $path = tempnam(sys_get_temp_dir(), 'signature-');
        $image = imagecreatetruecolor(80, 40);
        imagealphablending($image, false);
        imagesavealpha($image, true);
        imagefill($image, 0, 0, imagecolorallocatealpha($image, 0, 0, 0, 127));
        imagesetpixel($image, 40, 20, imagecolorallocatealpha($image, 25, 25, 25, 0));
        imagepng($image, $path);
        imagedestroy($image);

        $processed = app(SignatureProcessor::class)->process(
            new UploadedFile($path, 'assinatura.png', 'image/png', null, true),
        );
        @unlink($path);

        $result = imagecreatefromstring($processed);
        $corner = imagecolorsforindex($result, imagecolorat($result, 0, 0));
        $this->assertSame(127, $corner['alpha']);
        $this->assertLessThan(127, $this->minimumAlpha($result));
        imagedestroy($result);
    }

    public function test_authorized_user_can_remove_signature_file_and_setting(): void
    {
        Storage::fake('local');
        $admin = $this->user('Administrador', 'signature-admin');
        $path = 'company/signatures/existing.png';
        Storage::disk('local')->put($path, 'png-data');
        DB::table('settings')->updateOrInsert(
            ['key' => 'technical_signature'],
            ['value' => $path, 'type' => 'private_file', 'created_at' => now(), 'updated_at' => now()],
        );

        $this->actingAs($admin)
            ->deleteJson('/api/settings/signature')
            ->assertOk()
            ->assertExactJson(['configured' => false]);

        Storage::disk('local')->assertMissing($path);
        $this->assertDatabaseMissing('settings', ['key' => 'technical_signature']);
        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $admin->id,
            'action' => 'settings.signature_removed',
            'subject_type' => 'settings',
        ]);
    }

    private function minimumAlpha(\GdImage $image): int
    {
        $minimum = 127;
        for ($y = 0; $y < imagesy($image); $y++) {
            for ($x = 0; $x < imagesx($image); $x++) {
                $color = imagecolorsforindex($image, imagecolorat($image, $x, $y));
                $minimum = min($minimum, $color['alpha']);
            }
        }

        return $minimum;
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
