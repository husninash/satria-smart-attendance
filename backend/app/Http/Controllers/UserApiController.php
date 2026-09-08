<?php

namespace App\Http\Controllers;

use App\Models\Role;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class UserApiController extends Controller
{
    /**
     * Tampilkan daftar seluruh pegawai dengan pencarian & filter unit.
     */
    public function index(Request $request): JsonResponse
    {
        $query = User::with('roles')->orderBy('name', 'asc');

        // Filter pencarian: Nama, NIP, atau Email
        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('nip', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        // Filter divisi / unit kerja
        if ($dept = $request->query('department')) {
            if ($dept !== 'all') {
                $query->where(function ($q) use ($dept) {
                    $q->where('department', $dept)
                      ->orWhere('department', 'like', "%{$dept}%");
                });
            }
        }

        // Filter role
        if ($role = $request->query('role')) {
            if ($role !== 'all') {
                $query->where('role', $role);
            }
        }

        $users = $query->get()->map(function ($u) {
            $roleNames = $u->roles->pluck('name')->toArray();
            $roleSlugs = $u->roles->pluck('slug')->toArray();
            return [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'nip' => $u->nip ?? '—',
                'department' => $u->department ?? 'Infrastruktur TIK',
                'role' => $u->role ?? 'pegawai',
                'roles' => !empty($roleSlugs) ? $roleSlugs : [$u->role ?? 'pegawai'],
                'roleLabels' => !empty($roleNames) ? $roleNames : [ucfirst($u->role ?? 'pegawai')],
                'created_at' => $u->created_at ? $u->created_at->format('d M Y') : '—',
            ];
        });

        // Ambil daftar unik semua divisi untuk filter dropdown
        $departments = User::distinct()->pluck('department')->filter()->values();

        return response()->json([
            'success' => true,
            'data' => [
                'users' => $users,
                'total' => $users->count(),
                'departments' => $departments,
            ],
        ]);
    }

    /**
     * Daftarkan pegawai baru.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'nip' => ['nullable', 'string', 'max:50'],
            'department' => ['required', 'string', 'max:255'],
            'role' => ['required', 'in:pegawai,admin'],
            'password' => ['required', 'string', 'min:6'],
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'nip' => $validated['nip'] ?? null,
            'department' => $validated['department'],
            'role' => $validated['role'],
            'password' => Hash::make($validated['password']),
        ]);

        // Sync Role OOP model
        $roleModel = Role::firstOrCreate(
            ['slug' => $validated['role']],
            ['name' => $validated['role'] === 'admin' ? 'Admin SDM' : 'Pegawai Presensi']
        );
        $user->roles()->sync([$roleModel->id]);

        return response()->json([
            'success' => true,
            'message' => 'Pegawai berhasil ditambahkan ke sistem SATRIA.',
            'data' => $user->load('roles'),
        ], 201);
    }

    /**
     * Perbarui data pegawai.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $user = User::findOrFail($id);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'nip' => ['nullable', 'string', 'max:50'],
            'department' => ['required', 'string', 'max:255'],
            'role' => ['required', 'in:pegawai,admin'],
            'password' => ['nullable', 'string', 'min:6'],
        ]);

        $user->name = $validated['name'];
        $user->email = $validated['email'];
        $user->nip = $validated['nip'] ?? null;
        $user->department = $validated['department'];
        $user->role = $validated['role'];

        if (!empty($validated['password'])) {
            $user->password = Hash::make($validated['password']);
        }

        $user->save();

        // Update Role OOP model
        $roleModel = Role::firstOrCreate(
            ['slug' => $validated['role']],
            ['name' => $validated['role'] === 'admin' ? 'Admin SDM' : 'Pegawai Presensi']
        );
        $user->roles()->sync([$roleModel->id]);

        return response()->json([
            'success' => true,
            'message' => 'Data pegawai berhasil diperbarui.',
            'data' => $user->load('roles'),
        ]);
    }

    /**
     * Hapus akun pegawai.
     */
    public function destroy(int $id): JsonResponse
    {
        $user = User::findOrFail($id);

        // Proteksi: jangan hapus akun administrator utama
        if ($user->email === 'admin@satria.id' || $user->email === 'husni@satria.id') {
            return response()->json([
                'success' => false,
                'message' => 'Akun administrator inti tidak dapat dihapus.',
            ], 403);
        }

        $user->roles()->detach();
        $user->delete();

        return response()->json([
            'success' => true,
            'message' => "Pegawai {$user->name} berhasil dihapus dari sistem.",
        ]);
    }
}
