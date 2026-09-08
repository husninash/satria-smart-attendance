<?php

namespace App\Http\Controllers;

use App\Services\AuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    private AuthService $authService;

    public function __construct(AuthService $authService)
    {
        $this->authService = $authService;
    }

    /**
     * Endpoint API Login Pegawai
     */
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|string',
            'password' => 'required|string',
        ]);

        try {
            $result = $this->authService->authenticate(
                $request->input('email'),
                $request->input('password')
            );

            return response()->json([
                'success' => true,
                'message' => $result['message'],
                'data' => [
                    'user' => $result['user'],
                    'token' => $result['token'],
                ]
            ], 200);
        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat memproses login: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Endpoint API Logout Pegawai
     */
    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user) {
            $this->authService->logout($user);
        }

        return response()->json([
            'success' => true,
            'message' => 'Sesi berhasil diakhiri (Logout).'
        ]);
    }

    /**
     * Resolusi identitas user yang sedang request
     */
    protected function resolveUser(Request $request)
    {
        $user = $request->user();
        if ($user) {
            return $user;
        }

        $token = $request->bearerToken();
        if ($token) {
            $accessToken = \Laravel\Sanctum\PersonalAccessToken::findToken($token);
            if ($accessToken) {
                return $accessToken->tokenable;
            }
        }

        $email = $request->header('X-User-Email') ?: $request->query('user_email') ?: $request->input('user_email');
        if ($email) {
            $found = \App\Models\User::where('email', $email)->first();
            if ($found) {
                return $found;
            }
        }

        return null;
    }

    /**
     * Dapatkan data profil user saat ini
     */
    public function me(Request $request): JsonResponse
    {
        $user = $this->resolveUser($request);
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Sesi tidak valid atau telah berakhir.',
            ], 401);
        }

        $roleSlugs = $user->roles->pluck('slug')->toArray();
        $primaryRole = in_array('admin', $roleSlugs) ? 'Admin SDM & Pegawai' : 'Pegawai';

        return response()->json([
            'success' => true,
            'data' => [
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
                    'created_at' => $user->created_at ? $user->created_at->format('d M Y') : '—',
                ]
            ]
        ]);
    }

    /**
     * Perbarui data profil akun pengguna mandiri
     */
    public function updateProfile(Request $request): JsonResponse
    {
        $user = $this->resolveUser($request);
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Sesi tidak valid atau telah berakhir.',
            ], 401);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', \Illuminate\Validation\Rule::unique('users', 'email')->ignore($user->id)],
            'nip' => ['nullable', 'string', 'max:50'],
            'department' => ['nullable', 'string', 'max:255'],
            'current_password' => ['nullable', 'string'],
            'new_password' => ['nullable', 'string', 'min:6'],
        ]);

        try {
            $updatedUser = $this->authService->updateProfile($user, $validated);

            return response()->json([
                'success' => true,
                'message' => 'Profil pengguna berhasil diperbarui.',
                'data' => [
                    'user' => $updatedUser,
                ],
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal memperbarui profil: ' . $e->getMessage(),
            ], 500);
        }
    }
}
