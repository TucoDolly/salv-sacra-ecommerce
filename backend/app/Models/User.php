<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable(['name', 'email', 'password', 'papel', 'telefone', 'cpf', 'data_nascimento'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'data_nascimento' => 'date:Y-m-d',
            'password' => 'hashed',
        ];
    }

    public function enderecos(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(Endereco::class);
    }

    public function pedidos(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(Pedido::class);
    }
}
