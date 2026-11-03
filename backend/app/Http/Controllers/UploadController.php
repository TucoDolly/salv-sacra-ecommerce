<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class UploadController extends Controller
{
    /**
     * Realiza o upload de imagens de produtos e carrossel para o armazenamento público.
     */
    public function upload(Request $request): JsonResponse
    {
        $request->validate([
            'arquivo' => ['required', 'file', 'image', 'mimes:jpeg,png,jpg,webp,gif', 'max:5120'], // máx 5MB
        ], [
            'arquivo.required' => 'Nenhum arquivo de imagem foi enviado.',
            'arquivo.image'    => 'O arquivo enviado deve ser uma imagem válida.',
            'arquivo.mimes'    => 'A imagem deve estar no formato JPEG, PNG, JPG, WEBP ou GIF.',
            'arquivo.max'      => 'A imagem não pode ultrapassar 5MB.',
        ]);

        $file = $request->file('arquivo');
        $ext = $file->getClientOriginalExtension() ?: 'jpg';
        $nome = Str::random(24) . '.' . strtolower($ext);

        // Salva na pasta public/storage/produtos
        $caminho = $file->storeAs('produtos', $nome, 'public');

        // Retorna a URL pública completa
        $url = url('storage/' . $caminho);

        return response()->json([
            'message' => 'Upload realizado com sucesso!',
            'url'     => $url,
        ], 201);
    }
}
