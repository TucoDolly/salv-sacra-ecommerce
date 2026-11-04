<?php

namespace App\Mail;

use App\Models\User;
use App\Models\Variacao;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ProdutoDisponivelMail extends Mailable
{
    use Queueable, SerializesModels;

    public User $user;
    public Variacao $variacao;
    public string $produtoUrl;

    public function __construct(User $user, Variacao $variacao)
    {
        $this->user = $user;
        $this->variacao = $variacao->loadMissing('produto');
        $frontendUrl = env('FRONTEND_URL', 'http://localhost:5173');
        $this->produtoUrl = rtrim($frontendUrl, '/') . '/produto/' . $variacao->produto_id;
    }

    public function envelope(): Envelope
    {
        $nome = $this->variacao->produto?->nome ?? 'Produto';
        return new Envelope(
            subject: "Chegou! {$nome} (tamanho {$this->variacao->tamanho}) está disponível - Salv Sacra",
        );
    }

    public function content(): Content
    {
        return new Content(view: 'emails.produto_disponivel');
    }

    public function attachments(): array
    {
        return [];
    }
}

