<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ModeloCamiseta extends Model
{
    use HasFactory;

    protected $table = 'modelos_camiseta';

    protected $fillable = [
        'nome',
        'slug',
        'descricao',
    ];
}

