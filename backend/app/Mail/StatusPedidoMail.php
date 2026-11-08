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
    public string $avaliarUrl;

    /**
     * Create a new message instance.
     */
    public function __construct(Pedido $pedido)
    {
        $this->pedido = $pedido;
        $frontendUrl = env('FRONTEND_URL', 'http://localhost:5173');
        $emailParam = urlencode($pedido->user?->email ?? $pedido->email_contato ?? '');
        $this->minhaContaUrl = rtrim($frontendUrl, '/') . '/minha-conta?aba=pedidos&pedido=' . $pedido->id . '&email=' . $emailParam;
        $this->avaliarUrl = rtrim($frontendUrl, '/') . '/minha-conta?aba=pedidos&pedido=' . $pedido->id . '&avaliar=1&email=' . $emailParam;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        $assunto = $this->pedido->status === 'Entregue'
            ? "🎉 Seu Pedido #{$this->pedido->id} foi entregue! Avalie seus produtos - Salv Sacra"
            : "Atualização no seu Pedido #{$this->pedido->id} - Status: {$this->pedido->status}";

        return new Envelope(
            subject: $assunto,
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
