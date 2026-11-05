<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // The Developer Team card can list several emails and phone numbers. The
    // original single email/phone columns stay (they hold the first entry, so
    // older code keeps working) and existing rows are copied into the new lists.
    public function up(): void
    {
        Schema::table('developer_team', function (Blueprint $table) {
            $table->json('emails')->nullable()->after('email');
            $table->json('phones')->nullable()->after('phone');
        });

        foreach (DB::table('developer_team')->get() as $row) {
            DB::table('developer_team')->where('id', $row->id)->update([
                'emails' => json_encode(array_values(array_filter([$row->email]))),
                'phones' => json_encode(array_values(array_filter([$row->phone]))),
            ]);
        }
    }

    public function down(): void
    {
        Schema::table('developer_team', function (Blueprint $table) {
            $table->dropColumn(['emails', 'phones']);
        });
    }
};
