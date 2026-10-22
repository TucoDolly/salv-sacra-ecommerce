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

    // ── Helpers ─────────────────────────────────────────────────────────

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
