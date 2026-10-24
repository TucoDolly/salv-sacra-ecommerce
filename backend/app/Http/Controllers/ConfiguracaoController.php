<?php

namespace App\Http\Controllers;

use App\Models\Configuracao;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ConfiguracaoController extends Controller
{
    /**
     * Retorna todas as configurações para a administração, organizadas por chave e grupo.
     */
    public function index(): JsonResponse
    {
        $configs = Configuracao::all()->pluck('valor', 'chave');
        return response()->json($configs);
    }

    /**
     * Retorna apenas configurações públicas necessárias para a vitrine (banner, contatos, etc.).
     */
    public function publicas(): JsonResponse
    {
        $chavesPublicas = [
            'nome_loja',
            'slogan_loja',
            'frete_gratis_minimo',
            'aviso_topo_texto',
            'aviso_topo_ativo',
            'pix_desconto_pct',
            'contato_email',
            'contato_telefone',
            'contato_whatsapp',
            'contato_endereco',
            'instagram_url',
        ];

        $configs = Configuracao::whereIn('chave', $chavesPublicas)
            ->pluck('valor', 'chave');

        return response()->json($configs);
    }

    /**
     * Atualiza um lote de configurações passadas como chave => valor.
     */
    public function updateBatch(Request $request): JsonResponse
    {
        $dados = $request->all();

        foreach ($dados as $chave => $valor) {
            Configuracao::updateOrCreate(
                ['chave' => $chave],
                ['valor' => (string) $valor]
            );
        }

        $todas = Configuracao::all()->pluck('valor', 'chave');

        return response()->json([
            'message' => 'Configurações atualizadas com sucesso.',
            'configuracoes' => $todas,
        ]);
    }
}
