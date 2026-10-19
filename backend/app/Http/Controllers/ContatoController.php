<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ContatoController extends Controller
{
    /**
     * Recebe o formulário de contato e valida o reCAPTCHA no Google.
     */
    public function enviar(Request $request): JsonResponse
    {
        $dados = $request->validate([
            'nome'      => ['required', 'string', 'max:255'],
            'email'     => ['required', 'email', 'max:255'],
            'telefone'  => ['nullable', 'string', 'max:30'],
            'mensagem'  => ['required', 'string', 'max:5000'],
            'recaptcha' => ['required', 'string'],
        ]);

        $resposta = Http::asForm()->post('https://www.google.com/recaptcha/api/siteverify', [
            'secret'   => env('RECAPTCHA_SECRET_KEY', '6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe'),
            'response' => $dados['recaptcha'],
            'remoteip' => $request->ip(),
        ]);

        if (! $resposta->json('success')) {
            return response()->json(['message' => 'Falha na verificação do reCAPTCHA.'], 422);
        }

        unset($dados['recaptcha']);
        Log::info('Nova mensagem de contato', $dados);

        return response()->json(['message' => 'Mensagem enviada com sucesso.']);
    }
}
