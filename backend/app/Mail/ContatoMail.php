<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ContatoMail extends Mailable
{
    use Queueable, SerializesModels;

    public array $dados;

    /**
     * Create a new message instance.
     */
    public function __construct(array $dados)
    {
        $this->dados = $dados;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            replyTo: [$this->dados['email']],
            subject: 'Nova mensagem de contato recebida no site - Salv Sacra',
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.contato',
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
