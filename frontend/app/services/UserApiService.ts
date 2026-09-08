export interface UserItem {
  id: number;
  name: string;
  email: string;
  nip?: string;
  department: string;
  role: string;
  roles: string[];
  roleLabels: string[];
  created_at?: string;
}

export interface UserListResponse {
  success: boolean;
  data: {
    users: UserItem[];
    total: number;
    departments: string[];
  };
}

const API_BASE_URL = "/api";

export class UserApiService {
  private static instance: UserApiService;

  private constructor() {}

  public static getInstance(): UserApiService {
    if (!UserApiService.instance) {
      UserApiService.instance = new UserApiService();
    }
    return UserApiService.instance;
  }

  public async getUsers(search = "", department = "all", role = "all"): Promise<UserListResponse> {
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (department && department !== "all") params.append("department", department);
    if (role && role !== "all") params.append("role", role);

    const token = typeof window !== "undefined" ? localStorage.getItem("satria_auth_token") : null;
    const res = await fetch(`${API_BASE_URL}/users?${params.toString()}`, {
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!res.ok) {
      throw new Error("Gagal mengambil data pegawai");
    }

    return await res.json();
  }

  public async createUser(data: {
    name: string;
    email: string;
    nip?: string;
    department: string;
    role: string;
    password?: string;
  }): Promise<{ success: boolean; message: string; data: UserItem }> {
    const token = typeof window !== "undefined" ? localStorage.getItem("satria_auth_token") : null;
    const res = await fetch(`${API_BASE_URL}/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(data),
    });

    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.message || "Gagal mendaftarkan pegawai");
    }

    return result;
  }

  public async updateUser(
    id: number,
    data: {
      name: string;
      email: string;
      nip?: string;
      department: string;
      role: string;
      password?: string;
    }
  ): Promise<{ success: boolean; message: string; data: UserItem }> {
    const token = typeof window !== "undefined" ? localStorage.getItem("satria_auth_token") : null;
    const res = await fetch(`${API_BASE_URL}/users/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(data),
    });

    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.message || "Gagal memperbarui data pegawai");
    }

    return result;
  }

  public async deleteUser(id: number): Promise<{ success: boolean; message: string }> {
    const token = typeof window !== "undefined" ? localStorage.getItem("satria_auth_token") : null;
    const res = await fetch(`${API_BASE_URL}/users/${id}`, {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.message || "Gagal menghapus pegawai");
    }

    return result;
  }
}

export const userApiService = UserApiService.getInstance();
