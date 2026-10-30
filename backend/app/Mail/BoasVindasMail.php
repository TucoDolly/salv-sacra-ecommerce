<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class BoasVindasMail extends Mailable
{
    use Queueable, SerializesModels;

    public User $user;
    public string $storeUrl;

    /**
     * Create a new message instance.
     */
    public function __construct(User $user)
    {
        $this->user = $user;
        $frontendUrl = env('FRONTEND_URL', 'http://localhost:5173');
        $this->storeUrl = rtrim($frontendUrl, '/');
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Bem-vindo(a) à Salv Sacra! Sua conta foi criada com sucesso',
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.boas_vindas',
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
