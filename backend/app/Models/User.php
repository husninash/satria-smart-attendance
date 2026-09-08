<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'department',
        'nip',
    ];

    /**
     * Relasi Many-to-Many ke Model Role via tabel perantara role_user.
     */
    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class, 'role_user');
    }

    /**
     * Helper OOP untuk memeriksa apakah user memiliki role tertentu.
     *
     * @param string|array $roles Contoh: 'admin' atau ['admin', 'pegawai']
     */
    public function hasRole(string|array $roles): bool
    {
        if (is_array($roles)) {
            return $this->roles->whereIn('slug', $roles)->isNotEmpty();
        }

        return $this->roles->contains('slug', $roles);
    }

    /**
     * Helper OOP untuk menambahkan role ke user.
     */
    public function assignRole(Role|string $role): void
    {
        if (is_string($role)) {
            $roleModel = Role::where('slug', $role)->firstOrFail();
            $this->roles()->syncWithoutDetaching([$roleModel->id]);
            return;
        }

        $this->roles()->syncWithoutDetaching([$role->id]);
    }

    /**
     * Helper OOP untuk memeriksa Role Admin SDM
     */
    public function isAdmin(): bool
    {
        return $this->hasRole('admin');
    }

    /**
     * Helper OOP untuk memeriksa Role Pegawai Presensi
     */
    public function isEmployee(): bool
    {
        return $this->hasRole('pegawai');
    }

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }
}
