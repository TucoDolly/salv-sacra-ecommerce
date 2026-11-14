<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pedido Entregue</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
    <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">
        <!-- Header -->
        <div style="background-color: #0f172a; padding: 32px 24px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 2px;">SALV SACRA</h1>
            <p style="color: #94a3b8; margin: 6px 0 0 0; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Painel Administrativo — Notificação de Entrega</p>
        </div>

        <div style="padding: 32px 24px;">
            <div style="display: inline-block; background-color: #dcfce7; color: #15803d; border: 1px solid #86efac; padding: 6px 12px; border-radius: 9999px; font-size: 13px; font-weight: 700; margin-bottom: 20px;">
                ✅ Pedido Entregue ao Destinatário
            </div>

            <h2 style="font-size: 20px; font-weight: 700; color: #0f172a; margin: 0 0 12px 0;">
                O Pedido #{{ $pedido->id }} foi concluído e entregue!
            </h2>
            <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 24px 0;">
                A transportadora confirmou a entrega das peças ao cliente. O ciclo de logística deste pedido foi finalizado com êxito.
            </p>

            <!-- Detalhes do Pedido -->
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin-bottom: 24px;">
                <p style="margin: 0 0 8px 0; font-size: 13px; color: #64748b;"><strong>Cliente:</strong> {{ $pedido->user?->name ?? 'Cliente' }} ({{ $pedido->email_contato ?? $pedido->user?->email }})</p>
                @if($pedido->codigo_rastreio)
                <p style="margin: 0 0 8px 0; font-size: 13px; color: #64748b;"><strong>Rastreio:</strong> {{ $pedido->codigo_rastreio }}</p>
                @endif
                <p style="margin: 0 0 8px 0; font-size: 13px; color: #64748b;"><strong>Endereço de Entrega:</strong> {{ $pedido->logradouro }}, {{ $pedido->numero }} — {{ $pedido->cidade }}/{{ $pedido->estado }}</p>
                <p style="margin: 0; font-size: 13px; color: #0f172a;"><strong>Valor Total:</strong> R$ {{ number_format($pedido->valor_total, 2, ',', '.') }}</p>
            </div>

            <!-- Itens -->
            <h3 style="font-size: 14px; font-weight: 700; color: #0f172a; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 0.5px;">Itens Entregues</h3>
            <div style="margin-bottom: 24px;">
                @foreach($pedido->itens as $item)
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px;">
                    <span style="color: #334155;">{{ $item->quantidade }}x {{ $item->variacao?->produto?->nome ?? 'Camiseta Salv Sacra' }} ({{ $item->variacao?->tamanho ?? 'M' }} / {{ $item->variacao?->cor ?? 'Padrão' }})</span>
                    <span style="font-weight: 600; color: #0f172a;">R$ {{ number_format($item->preco_unitario * $item->quantidade, 2, ',', '.') }}</span>
                </div>
                @endforeach
            </div>

            <div style="text-align: center; margin-top: 32px;">
                <a href="{{ url('/admin/pedidos') }}" style="display: inline-block; background-color: #0f172a; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-size: 14px; font-weight: 600;">
                    Acessar Gestão de Pedidos
                </a>
            </div>
        </div>

        <div style="background-color: #f8fafc; padding: 20px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="font-size: 12px; color: #94a3b8; margin: 0;">
                Salv Sacra E-commerce &bull; Notificação Interna do Sistema
            </p>
        </div>
    </div>
</body>
</html>

