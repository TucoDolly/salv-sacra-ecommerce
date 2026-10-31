<?php

namespace App\Http\Controllers;

use App\Models\Endereco;
use App\Models\Pedido;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Área "Minha Conta" do cliente autenticado:
 * perfil, senha, endereços e pedidos.
 */
class ContaController extends Controller
{
    /** Retorna resumo para a tela inicial da conta: contadores e último pedido. */
    public function resumo(Request $request): JsonResponse
    {
        $user = $request->user();

        $ultimoPedido = Pedido::where('user_id', $user->id)
            ->orderByDesc('data_pedido')
            ->first();

        return response()->json([
            'total_pedidos'   => $user->pedidos()->count(),
            'total_enderecos' => $user->enderecos()->count(),
            'total_cartoes'   => $user->cartoes()->count(),
            'total_favoritos' => $user->favoritos()->count(),
            'ultimo_pedido'   => $ultimoPedido,
        ]);
    }

    /** Atualiza as informações pessoais. */
    public function atualizarPerfil(Request $request): JsonResponse
    {
        $user = $request->user();

        $dados = $request->validate([
            'name'            => ['required', 'string', 'max:255'],
            'email'           => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'telefone'        => ['nullable', 'string', 'max:30'],
            'cpf'             => ['nullable', 'string', 'max:14'],
            'data_nascimento' => ['nullable', 'date', 'before:today'],
        ]);

        $user->update($dados);

        return response()->json(['message' => 'Dados atualizados com sucesso.', 'user' => $user->fresh()]);
    }

    /** Altera a senha confirmando a senha atual. */
    public function alterarSenha(Request $request): JsonResponse
    {
        $request->validate([
            'senha_atual' => ['required', 'string'],
            'password'    => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $user = $request->user();

        if (! Hash::check($request->senha_atual, $user->password)) {
            throw ValidationException::withMessages([
                'senha_atual' => ['A senha atual está incorreta.'],
            ]);
        }

        $user->update(['password' => $request->password]);

        return response()->json(['message' => 'Senha alterada com sucesso.']);
    }

    // ── Endereços ───────────────────────────────────────────────────────

    public function enderecos(Request $request): JsonResponse
    {
        return response()->json($request->user()->enderecos()->latest()->get());
    }

    /**
     * Retorna o endereço mais recente usado em compras pelo usuário, caso não possua endereço salvo no perfil.
     */
    public function ultimoEnderecoPedido(Request $request): JsonResponse
    {
        $ultimoPedido = Pedido::where('user_id', $request->user()->id)
            ->whereNotNull('cep')
            ->whereNotNull('logradouro')
            ->orderByDesc('id')
            ->first();

        if (! $ultimoPedido) {
            return response()->json(null);
        }

        return response()->json([
            'cep'         => $ultimoPedido->cep,
            'logradouro'  => $ultimoPedido->logradouro,
            'numero'      => $ultimoPedido->numero,
            'complemento' => $ultimoPedido->complemento,
            'bairro'      => $ultimoPedido->bairro,
            'cidade'      => $ultimoPedido->cidade,
            'estado'      => $ultimoPedido->estado,
            'telefone'    => $ultimoPedido->telefone,
        ]);
    }

    public function criarEndereco(Request $request): JsonResponse
    {
        $endereco = $request->user()->enderecos()->create($this->validarEndereco($request));

        return response()->json($endereco, 201);
    }

    public function atualizarEndereco(Request $request, Endereco $endereco): JsonResponse
    {
        $this->autorizarEndereco($request, $endereco);
        $endereco->update($this->validarEndereco($request));

        return response()->json($endereco);
    }

    public function removerEndereco(Request $request, Endereco $endereco): JsonResponse
    {
        $this->autorizarEndereco($request, $endereco);
        $endereco->delete();

        return response()->json(['message' => 'Endereço removido.']);
    }

    // ── Pedidos ─────────────────────────────────────────────────────────

    public function pedidos(Request $request): JsonResponse
    {
        $pedidos = Pedido::where('user_id', $request->user()->id)
            ->with(['itens.variacao.produto'])
            ->orderByDesc('data_pedido')
            ->get();

        return response()->json($pedidos);
    }

    // ── Cartões ─────────────────────────────────────────────────────────

    public function cartoes(Request $request): JsonResponse
    {
        return response()->json($request->user()->cartoes()->latest()->get());
    }

    public function criarCartao(Request $request): JsonResponse
    {
        $dados = $request->validate([
            'tipo'     => ['required', 'in:credito,debito'],
            'titular'  => ['required', 'string', 'max:255'],
            'numero'   => ['required', 'string', 'min:12', 'max:25'],
            'validade' => ['required', 'string', 'regex:/^(0[1-9]|1[0-2])\/?([0-9]{2}|[0-9]{4})$/'],
            'bandeira' => ['nullable', 'string', 'max:50'],
        ]);

        $limpo = preg_replace('/\D/', '', $dados['numero']);
        $ultimos = substr($limpo, -4);
        // Mascara os números intermediários preservando os últimos 4 dígitos
        $numeroMascarado = str_repeat('*', max(0, strlen($limpo) - 4)) . $ultimos;

        $cartao = $request->user()->cartoes()->create([
            'tipo'            => $dados['tipo'],
            'titular'         => mb_strtoupper($dados['titular']),
            'numero'          => $numeroMascarado,
            'ultimos_digitos' => $ultimos,
            'bandeira'        => $dados['bandeira'] ?? $this->identificarBandeira($limpo),
            'validade'        => $dados['validade'],
        ]);

        return response()->json($cartao, 201);
    }

    public function removerCartao(Request $request, \App\Models\Cartao $cartao): JsonResponse
    {
        abort_unless($cartao->user_id === $request->user()->id, 403, 'Acesso negado.');
        $cartao->delete();

        return response()->json(['message' => 'Cartão removido com sucesso.']);
    }

    // ── Lista de Desejos (Favoritos / Wishlist) ─────────────────────────

    public function favoritos(Request $request): JsonResponse
    {
        $favoritos = $request->user()
            ->favoritos()
            ->with([
                'produto' => function ($q) {
                    $q->with(['categoria', 'devocao', 'variacoes'])
                      ->withCount('avaliacoes')
                      ->withAvg('avaliacoes', 'nota');
                },
            ])
            ->latest()
            ->get()
            ->map(fn ($fav) => $fav->produto)
            ->filter()
            ->values();

        return response()->json($favoritos);
    }

    public function toggleFavorito(Request $request, \App\Models\Produto $produto): JsonResponse
    {
        $user = $request->user();

        $existente = $user->favoritos()->where('produto_id', $produto->id)->first();

        if ($existente) {
            $existente->delete();
            return response()->json([
                'favoritado' => false,
                'produto_id' => $produto->id,
                'message'    => 'Produto removido da sua lista de desejos.',
            ]);
        }

        $user->favoritos()->create([
            'produto_id' => $produto->id,
        ]);

        return response()->json([
            'favoritado' => true,
            'produto_id' => $produto->id,
            'message'    => 'Produto salvo na sua lista de desejos!',
        ], 201);
    }

    public function sincronizarFavoritos(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'produto_ids'   => ['required', 'array'],
            'produto_ids.*' => ['integer', 'exists:produtos,id'],
        ]);

        $user = $request->user();
        foreach ($validated['produto_ids'] as $pid) {
            $user->favoritos()->firstOrCreate(['produto_id' => $pid]);
        }

        return $this->favoritos($request);
    }

    /**
     * Desativa a conta do usuário a seu pedido:
     * - Preserva os pedidos e dados cadastrais para consulta exclusiva do administrador (logística, emissão fiscal e histórico).
     * - Mantém o nome do cliente original com o sufixo " (Conta Desativada)".
     * - Libera o e-mail para eventuais novos cadastros futuros prefixando como desativado.
     * - Remove cartões salvos e tokens de acesso para garantir a segurança.
     * - Invalida a senha de acesso e aplica Soft Delete no usuário.
     */
    public function excluirConta(Request $request): JsonResponse
    {
        $user = $request->user();

        \Illuminate\Support\Facades\DB::transaction(function () use ($user) {
            // 1. Remove dados sensíveis de pagamento e sessões ativas
            $user->cartoes()->delete();
            $user->enderecos()->delete();
            $user->favoritos()->delete();
            $user->tokens()->delete();

            // 2. Preserva o nome do cliente original com a indicação "(Conta Desativada)"
            $nomeBase = trim(preg_replace('/\s*\(Conta Desativada\)/i', '', $user->name ?: 'Cliente'));
            $nomeAtualizado = $nomeBase . ' (Conta Desativada)';

            // Mantém os dados cadastrais (telefone, CPF, nascimento) disponíveis para o administrador
            $user->update([
                'name'     => $nomeAtualizado,
                'email'    => 'desativado_' . $user->id . '_' . $user->email,
                'password' => \Illuminate\Support\Facades\Hash::make(\Illuminate\Support\Str::random(60)),
            ]);

            // 3. Aplica Soft Delete para desativar o login e o acesso à conta
            $user->delete();
        });

        return response()->json([
            'message' => 'Sua conta foi desativada com sucesso.',
        ]);
    }

    // ── Helpers ─────────────────────────────────────────────────────────

    private function identificarBandeira(string $numero): string
    {
        if (preg_match('/^4/', $numero)) return 'Visa';
        if (preg_match('/^5[1-5]|^2[2-7]/', $numero)) return 'Mastercard';
        if (preg_match('/^3[47]/', $numero)) return 'American Express';
        if (preg_match('/^6(?:011|5)/', $numero)) return 'Discover';
        if (preg_match('/^(4011|4389|4514|4576|5041|5066|509|6277|6362|6363|650|6516|6550)/', $numero)) return 'Elo';
        if (preg_match('/^6062/', $numero)) return 'Hipercard';
        return 'Cartão';
    }

    private function validarEndereco(Request $request): array
    {
        return $request->validate([
            'cep'         => ['required', 'string', 'max:20'],
            'logradouro'  => ['required', 'string', 'max:255'],
            'numero'      => ['required', 'string', 'max:50'],
            'complemento' => ['nullable', 'string', 'max:255'],
            'bairro'      => ['required', 'string', 'max:150'],
            'cidade'      => ['required', 'string', 'max:150'],
            'estado'      => ['required', 'string', 'size:2'],
        ]);
    }

    private function autorizarEndereco(Request $request, Endereco $endereco): void
    {
        abort_unless($endereco->user_id === $request->user()->id, 403, 'Acesso negado.');
    }
}
