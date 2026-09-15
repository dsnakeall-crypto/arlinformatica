<?php

use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        // "Em Serviço" continua sendo um estado operacional válido. Não remapear dados históricos.
    }

    public function down(): void
    {
        // Sem alteração de dados para desfazer.
    }
};
