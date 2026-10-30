<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class RecuperarSenhaMail extends Mailable
{
    use Queueable, SerializesModels;

    public string $token;
    public string $email;
    public string $resetUrl;

    /**
     * Create a new message instance.
     */
    public function __construct(string $token, string $email)
    {
        $this->token = $token;
        $this->email = $email;
        $frontendUrl = env('FRONTEND_URL', 'http://localhost:5173');
        $this->resetUrl = rtrim($frontendUrl, '/') . '/redefinir-senha?token=' . urlencode($token) . '&email=' . urlencode($email);
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Recuperação de Senha - Salv Sacra',
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.recuperar_senha',
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
