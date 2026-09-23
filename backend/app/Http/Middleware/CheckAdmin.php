<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckAdmin
{
    /**
     * Verifica se o usuário autenticado possui o papel de administrador.
     *
     * Retorna 403 caso o usuário não esteja autenticado ou não seja admin.
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->user() || $request->user()->papel !== 'admin') {
            return response()->json([
                'message' => 'Acesso negado. Apenas administradores podem realizar esta ação.',
            ], Response::HTTP_FORBIDDEN);
        }

        return $next($request);
    }
}
