<?php

namespace App\Mail;

use App\Models\Pedido;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class StatusPedidoMail extends Mailable
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
            subject: "Atualização no seu Pedido #{$this->pedido->id} - Status: {$this->pedido->status}",
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.status_pedido',
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
