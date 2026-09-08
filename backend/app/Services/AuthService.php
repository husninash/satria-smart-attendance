<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthService
{
    /**
     * Otentikasi pegawai berdasarkan email dan password.
     * Mengembalikan data user dan token sesi.
     *
     * @param string $email
     * @param string $password
     * @return array
     * @throws ValidationException
     */
    public function authenticate(string $email, string $password): array
    {
        $user = User::where('email', $email)->first();

        if (!$user || !Hash::check($password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Email atau password yang Anda masukkan salah.'],
            ]);
        }

        $token = $user->createToken('satria_auth_token')->plainTextToken;
        $roleSlugs = $user->roles->pluck('slug')->toArray();
        $primaryRole = in_array('admin', $roleSlugs) ? 'Admin SDM & Pegawai' : 'Pegawai';

        return [
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $primaryRole,
                'roles' => $roleSlugs,
                'isAdmin' => in_array('admin', $roleSlugs),
                'nip' => $user->nip ?? '—',
                'department' => $user->department ?? 'Pusdatin Kemhan',
                'institution' => 'Pusdatin Kemhan',
            ],
            'token' => $token,
            'message' => 'Login berhasil. Selamat datang kembali, ' . $user->name,
        ];
    }

    /**
     * Logout dan cabut semua token aktif user.
     *
     * @param User $user
     * @return bool
     */
    public function logout(User $user): bool
    {
        $user->tokens()->delete();
        return true;
    }

    /**
     * Perbarui profil pengguna dan password.
     *
     * @param User $user
     * @param array $data
     * @return array
     * @throws ValidationException
     */
    public function updateProfile(User $user, array $data): array
    {
        if (isset($data['name'])) {
            $user->name = $data['name'];
        }
        if (isset($data['email'])) {
            $user->email = $data['email'];
        }
        if (array_key_exists('nip', $data)) {
            $user->nip = $data['nip'];
        }
        if (isset($data['department'])) {
            $user->department = $data['department'];
        }
        if (!empty($data['new_password'])) {
            if (!empty($data['current_password'])) {
                if (!Hash::check($data['current_password'], $user->password)) {
                    throw ValidationException::withMessages([
                        'current_password' => ['Password saat ini yang Anda masukkan salah.'],
                    ]);
                }
            }
            $user->password = Hash::make($data['new_password']);
        }

        $user->save();

        $roleSlugs = $user->roles->pluck('slug')->toArray();
        $primaryRole = in_array('admin', $roleSlugs) ? 'Admin SDM & Pegawai' : 'Pegawai';

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $primaryRole,
            'roles' => $roleSlugs,
            'isAdmin' => in_array('admin', $roleSlugs),
            'nip' => $user->nip ?? '—',
            'department' => $user->department ?? 'Pusdatin Kemhan',
            'institution' => 'Pusdatin Kemhan',
        ];
    }
}
