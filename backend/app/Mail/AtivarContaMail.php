<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AtivarContaMail extends Mailable
{
    use Queueable, SerializesModels;

    public string $name;
    public string $email;
    public string $verificationUrl;

    /**
     * Create a new message instance.
     */
    public function __construct(string $name, string $email, string $token)
    {
        $this->name = $name;
        $this->email = $email;
        $frontendUrl = env('FRONTEND_URL', 'http://localhost:5173');
        $this->verificationUrl = rtrim($frontendUrl, '/') . '/verificar-email?token=' . urlencode($token) . '&email=' . urlencode($email);
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Valide seu e-mail para ativar sua conta - Salv Sacra',
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.ativar_conta',
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
