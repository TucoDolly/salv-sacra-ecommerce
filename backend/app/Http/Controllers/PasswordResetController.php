<?php

namespace App\Http\Controllers;

use App\Mail\RecuperarSenhaMail;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class PasswordResetController extends Controller
{
    /**
     * Envia o link de redefinição de senha para o e-mail do usuário.
     */
    public function enviarLink(Request $request): JsonResponse
    {
        $request->validate([
            'email' => ['required', 'email'],
        ], [
            'email.required' => 'Informe o e-mail cadastrado.',
            'email.email'    => 'Informe um e-mail válido.',
        ]);

        $email = trim(strtolower($request->input('email')));
        $user = User::where('email', $email)->first();

        // Por segurança, respondemos sucesso mesmo se o e-mail não existir (evita enumeração)
        if (! $user) {
            return response()->json([
                'message' => 'Se o e-mail estiver cadastrado em nossa base, enviaremos as instruções para redefinição da senha.',
            ]);
        }

        // Gera token aleatório de 64 caracteres
        $token = Str::random(64);

        // Salva ou atualiza na tabela password_reset_tokens
        DB::table('password_reset_tokens')->updateOrInsert(
            ['email' => $email],
            [
                'token'      => Hash::make($token),
                'created_at' => now(),
            ]
        );

        // Dispara o e-mail
        try {
            Mail::to($user->email)->send(new RecuperarSenhaMail($token, $email));
        } catch (\Throwable $e) {
            \Log::error('Erro ao enviar e-mail de recuperação: ' . $e->getMessage());
        }

        return response()->json([
            'message' => 'Se o e-mail estiver cadastrado em nossa base, enviaremos as instruções para redefinição da senha.',
        ]);
    }

    /**
     * Valida o token e atualiza a senha do usuário.
     */
    public function redefinirSenha(Request $request): JsonResponse
    {
        $request->validate([
            'email'                 => ['required', 'email'],
            'token'                 => ['required', 'string'],
            'password'              => ['required', 'string', 'min:8', 'confirmed'],
        ], [
            'password.required'  => 'Informe a nova senha.',
            'password.min'       => 'A senha deve conter no mínimo 8 caracteres.',
            'password.confirmed' => 'A confirmação de senha não confere.',
        ]);

        $email = trim(strtolower($request->input('email')));
        $registro = DB::table('password_reset_tokens')->where('email', $email)->first();

        if (! $registro) {
            return response()->json([
                'message' => 'Solicitação de recuperação inválida ou expirada.',
            ], 422);
        }

        // Verifica se expirou (60 minutos)
        if (now()->diffInMinutes($registro->created_at) > 60) {
            DB::table('password_reset_tokens')->where('email', $email)->delete();
            return response()->json([
                'message' => 'Este link de recuperação expirou. Por favor, solicite um novo.',
            ], 422);
        }

        // Valida token
        if (! Hash::check($request->input('token'), $registro->token)) {
            return response()->json([
                'message' => 'Token de recuperação inválido.',
            ], 422);
        }

        // Atualiza a senha do usuário
        $user = User::where('email', $email)->first();
        if (! $user) {
            return response()->json(['message' => 'Usuário não encontrado.'], 404);
        }

        $user->password = Hash::make($request->input('password'));
        $user->save();

        // Remove token utilizado
        DB::table('password_reset_tokens')->where('email', $email)->delete();

        return response()->json([
            'message' => 'Sua senha foi redefinida com sucesso! Você já pode entrar com a nova senha.',
        ]);
    }
}
