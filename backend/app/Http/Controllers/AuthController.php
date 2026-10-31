<?php

namespace App\Http\Controllers;

use App\Mail\AtivarContaMail;
use App\Mail\BoasVindasMail;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Inicia o registro do usuário: armazena os dados pendentes e envia link de validação por e-mail.
     * A conta SÓ é criada no banco após a validação do e-mail.
     */
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'                  => ['required', 'string', 'max:255'],
            'email'                 => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password'              => ['required', 'string', 'min:8', 'confirmed'],
            'recaptcha'             => ['required', 'string'],
        ]);

        $resposta = Http::withoutVerifying()
            ->asForm()
            ->post('https://www.google.com/recaptcha/api/siteverify', [
                'secret'   => env('RECAPTCHA_SECRET_KEY', '6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe'),
                'response' => $validated['recaptcha'],
                'remoteip' => $request->ip(),
            ]);

        if (! $resposta->json('success')) {
            return response()->json(['message' => 'Falha na verificação do reCAPTCHA.'], 422);
        }

        $email = trim(strtolower($validated['email']));
        $token = Str::random(64);

        // Salva na tabela temporária até que o usuário valide o link no e-mail
        DB::table('pending_registrations')->updateOrInsert(
            ['email' => $email],
            [
                'name'       => trim($validated['name']),
                'password'   => Hash::make($validated['password']),
                'token'      => $token,
                'created_at' => now(),
            ]
        );

        // Dispara o e-mail de ativação de conta com o link de validação
        try {
            Mail::to($email)->send(new AtivarContaMail($validated['name'], $email, $token));
        } catch (\Throwable $e) {
            Log::error('Erro ao enviar e-mail de validação de conta: ' . $e->getMessage());
        }

        return response()->json([
            'message' => 'Um link de validação foi enviado para o seu e-mail.',
            'email'   => $email,
        ], 200);
    }

    /**
     * Reenvia o link de validação para um e-mail pendente.
     */
    public function reenviarValidacao(Request $request): JsonResponse
    {
        $request->validate(['email' => ['required', 'email']]);
        $email = trim(strtolower($request->email));

        $pendente = DB::table('pending_registrations')->where('email', $email)->first();
        if (! $pendente) {
            // Se já foi ativado
            if (User::where('email', $email)->exists()) {
                return response()->json(['message' => 'Esta conta já foi ativada. Você já pode fazer login.'], 400);
            }
            return response()->json(['message' => 'Nenhum cadastro pendente encontrado para este e-mail.'], 404);
        }

        $token = Str::random(64);
        DB::table('pending_registrations')->where('email', $email)->update([
            'token'      => $token,
            'created_at' => now(),
        ]);

        try {
            Mail::to($email)->send(new AtivarContaMail($pendente->name, $email, $token));
        } catch (\Throwable $e) {
            Log::error('Erro ao reenviar e-mail de validação: ' . $e->getMessage());
        }

        return response()->json(['message' => 'Link de verificação reenviado com sucesso!']);
    }

    /**
     * Valida o token recebido no e-mail, cria oficialmente o usuário e gera o token de autenticação.
     */
    public function verificarEmail(Request $request): JsonResponse
    {
        $request->validate([
            'email' => ['required', 'email'],
            'token' => ['required', 'string'],
        ]);

        $email = trim(strtolower($request->email));
        $pendente = DB::table('pending_registrations')
            ->where('email', $email)
            ->where('token', $request->token)
            ->first();

        if (! $pendente) {
            // Verifica se o usuário já validou antes
            $usuarioExistente = User::where('email', $email)->first();
            if ($usuarioExistente) {
                $token = $usuarioExistente->createToken('api-token')->plainTextToken;
                return response()->json([
                    'message'   => 'E-mail validado com sucesso! Sua conta está ativa.',
                    'ja_ativo'  => true,
                    'token'     => $token,
                    'user'      => $usuarioExistente,
                ]);
            }

            return response()->json([
                'message' => 'O link de validação é inválido ou expirou. Solicite um novo link.',
            ], 400);
        }

        // Cria o usuário oficialmente no banco de dados
        $user = User::create([
            'name'              => $pendente->name,
            'email'             => $pendente->email,
            'password'          => $pendente->password,
            'email_verified_at' => now(),
        ]);

        // Remove dos registros pendentes
        DB::table('pending_registrations')->where('email', $email)->delete();

        // Envia o e-mail de boas-vindas oficial
        try {
            Mail::to($user->email)->send(new BoasVindasMail($user));
        } catch (\Throwable $e) {
            Log::error('Erro ao enviar e-mail de boas-vindas: ' . $e->getMessage());
        }

        // Gera token de autenticação para já entrar logado
        $token = $user->createToken('api-token')->plainTextToken;

        return response()->json([
            'message' => 'E-mail validado com sucesso! Sua conta está ativa.',
            'token'   => $token,
            'user'    => $user,
        ], 200);
    }

    /**
     * Autentica o usuário e retorna o token de acesso.
     *
     * @throws ValidationException
     */
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email'    => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ]);

        if (! Auth::attempt($request->only('email', 'password'))) {
            throw ValidationException::withMessages([
                'email' => ['As credenciais fornecidas estão incorretas.'],
            ]);
        }

        /** @var User $user */
        $user  = Auth::user();
        $token = $user->createToken('api-token')->plainTextToken;

        return response()->json([
            'message' => 'Login realizado com sucesso.',
            'token'   => $token,
            'user'    => $user,
        ]);
    }

    /**
     * Revoga o token atual do usuário autenticado.
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logout realizado com sucesso.',
        ]);
    }

    /**
     * Retorna os dados do usuário autenticado.
     */
    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'user' => $request->user(),
        ]);
    }
}
