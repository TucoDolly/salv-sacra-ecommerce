<?php

namespace App\Mail;

use App\Models\Pedido;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PedidoCriadoMail extends Mailable
{
    use Queueable, SerializesModels;

    public Pedido $pedido;
    public string $minhaContaUrl;

    /**
     * Create a new message instance.
     */
    public function __construct(Pedido $pedido)
    {
        $this->pedido = $pedido;
        $frontendUrl = env('FRONTEND_URL', 'http://localhost:5173');
        $this->minhaContaUrl = rtrim($frontendUrl, '/') . '/minha-conta?aba=pedidos&pedido=' . $pedido->id . '&email=' . urlencode($pedido->user?->email ?? $pedido->email_contato ?? '');
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Pedido #{$this->pedido->id} Confirmado! - Salv Sacra",
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.pedido_criado',
        );
    }

    /**
     * Get the attachments for the message.
     */
    public function attachments(): array
    {
        return [];
    }
}
