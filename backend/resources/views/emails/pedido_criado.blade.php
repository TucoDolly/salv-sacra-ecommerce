<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Pedido Confirmado — Salv Sacra</title>
  <style>
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f7f7f7; margin: 0; padding: 20px; color: #333; }
    .card { max-width: 560px; margin: 20px auto; background: #ffffff; border-radius: 8px; border: 1px solid #e0e0e0; padding: 32px; }
    .logo { text-align: center; margin-bottom: 20px; font-size: 22px; font-weight: bold; letter-spacing: 0.1em; color: #1e1e1e; }
    h2 { font-size: 18px; color: #1e1e1e; margin-top: 0; }
    p { font-size: 14px; line-height: 1.6; color: #555; }
    .order-box { background: #fafafa; border: 1px solid #eee; border-radius: 6px; padding: 16px; margin: 20px 0; }
    .order-item { display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding: 8px 0; font-size: 13px; }
    .order-item:last-child { border-bottom: none; }
    .order-total { font-size: 16px; font-weight: bold; color: #1e1e1e; text-align: right; margin-top: 12px; }
    .footer { font-size: 12px; color: #888; border-top: 1px solid #eee; margin-top: 24px; padding-top: 16px; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">SALV SACRA</div>
    <h2>Obrigado pelo seu pedido, {{ $pedido->user->name ?? 'Cliente' }}!</h2>
    <p>Seu pedido <strong>#{{ $pedido->id }}</strong> foi recebido com sucesso e já está sendo processado.</p>

    <div class="order-box">
      <div style="font-weight: bold; margin-bottom: 8px; font-size: 14px;">Resumo do Pedido</div>
      @foreach($pedido->itens as $item)
        <div class="order-item">
          <span>{{ $item->quantidade }}x {{ $item->produto->nome ?? 'Produto' }} ({{ $item->tamanho ?? '-' }} / {{ $item->cor ?? '-' }})</span>
          <span>R$ {{ number_format($item->subtotal, 2, ',', '.') }}</span>
        </div>
      @endforeach
      <div class="order-total">
        Total: R$ {{ number_format($pedido->total, 2, ',', '.') }}
      </div>
    </div>

    <p>Você pode acompanhar o status da entrega e a previsão de chegada acessando a sua conta em nosso site.</p>
    
    <div class="footer">
      Salv Sacra — Vestindo a Fé com Elegância<br>
      Acompanhe seu pedido pelo site ou entre em contato pelo WhatsApp.
    </div>
  </div>
</body>
</html>

