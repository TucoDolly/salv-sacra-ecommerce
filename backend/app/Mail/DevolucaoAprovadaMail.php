<?php

namespace App\Mail;

use App\Models\Devolucao;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class DevolucaoAprovadaMail extends Mailable
{
    use Queueable, SerializesModels;

    public Devolucao $devolucao;
    public string $minhaContaUrl;

    public function __construct(Devolucao $devolucao)
    {
        $this->devolucao = $devolucao;
        $frontendUrl = env('FRONTEND_URL', 'http://localhost:5173');
        $this->minhaContaUrl = rtrim($frontendUrl, '/') . '/minha-conta?aba=pedidos&pedido=' . $devolucao->pedido_id;
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "📦 Devolução Aprovada! Código de Postagem dos Correios · Pedido #{$this->devolucao->pedido_id} - Salv Sacra",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.devolucao_aprovada',
        );
    }

    public function attachments(): array
    {
        return [];
    }
}

