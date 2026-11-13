<?php

namespace App\Mail;

use App\Models\Devolucao;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class NovaDevolucaoAdminMail extends Mailable
{
    use Queueable, SerializesModels;

    public Devolucao $devolucao;
    public string $adminUrl;

    /**
     * Create a new message instance.
     */
    public function __construct(Devolucao $devolucao)
    {
        $this->devolucao = $devolucao;
        $frontendUrl = env('FRONTEND_URL', 'http://localhost:5173');
        $this->adminUrl = rtrim($frontendUrl, '/') . '/admin/devolucoes';
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        $nomeCliente = $this->devolucao->user?->name ?? 'Cliente';
        $tipoSolicitacao = $this->devolucao->tipo_solicitacao === 'cupom' ? 'Troca' : 'Devolução';
        return new Envelope(
            subject: "📦 Nova Solicitação de {$tipoSolicitacao} · Pedido #{$this->devolucao->pedido_id} ({$nomeCliente}) - Salv Sacra",
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.nova_devolucao_admin',
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

