<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Configuracao extends Model
{
    protected $table = 'configuracoes';
    protected $primaryKey = 'chave';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'chave',
        'valor',
        'grupo',
        'descricao',
    ];

    /**
     * Retorna o valor de uma chave ou o padrão.
     */
    public static function get(string $chave, $default = null)
    {
        $registro = static::find($chave);
        return $registro ? $registro->valor : $default;
    }

    /**
     * Define ou atualiza uma configuração.
     */
    public static function set(string $chave, $valor, string $grupo = 'geral', ?string $descricao = null)
    {
        return static::updateOrCreate(
            ['chave' => $chave],
            [
                'valor' => $valor,
                'grupo' => $grupo,
                'descricao' => $descricao,
            ]
        );
    }
}
