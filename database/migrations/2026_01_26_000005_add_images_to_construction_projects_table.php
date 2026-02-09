<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddImagesToConstructionProjectsTable extends Migration
{
    public function up()
    {
        Schema::table('construction_projects', function (Blueprint $table) {
            $table->json('images_path')->nullable()->after('documents_path');
        });
    }

    public function down()
    {
        Schema::table('construction_projects', function (Blueprint $table) {
            $table->dropColumn('images_path');
        });
    }
}
