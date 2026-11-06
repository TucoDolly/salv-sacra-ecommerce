<?php

namespace App\Mail;

use App\Models\Pedido;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PedidoCanceladoAdminMail extends Mailable
{
    use Queueable, SerializesModels;

    public Pedido $pedido;
    public string $adminUrl;

    /**
     * Create a new message instance.
     */
    public function __construct(Pedido $pedido)
    {
        $this->pedido = $pedido;
        $frontendUrl = env('FRONTEND_URL', 'http://localhost:5173');
        $this->adminUrl = rtrim($frontendUrl, '/') . '/admin/pedidos';
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        $nomeCliente = $this->pedido->user?->name ?? 'Cliente';
        return new Envelope(
            subject: "⚠️ Pedido #{$this->pedido->id} Cancelado ({$nomeCliente}) - Salv Sacra",
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.pedido_cancelado_admin',
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

