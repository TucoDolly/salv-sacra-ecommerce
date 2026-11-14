<?php

namespace App\Mail;

use App\Models\Pedido;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class PedidoEntregueAdminMail extends Mailable
{
    use Queueable, SerializesModels;

    public Pedido $pedido;

    public function __construct(Pedido $pedido)
    {
        $this->pedido = $pedido;
    }

    public function build()
    {
        return $this->subject("✅ Pedido #{$this->pedido->id} foi ENTREGUE com sucesso! — Salv Sacra")
                    ->view('emails.pedido_entregue_admin');
    }
}

