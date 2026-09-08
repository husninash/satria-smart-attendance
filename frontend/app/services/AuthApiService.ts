export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: string;
  roles: string[];
  isAdmin: boolean;
  nip?: string;
  department: string;
  institution: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data?: {
    user: AuthUser;
    token: string;
  };
  errors?: Record<string, string[]>;
}

export class AuthApiService {
  private static instance: AuthApiService;
  private readonly TOKEN_KEY = "satria_auth_token";
  private readonly USER_KEY = "satria_auth_user";

  private constructor() {}

  public static getInstance(): AuthApiService {
    if (!AuthApiService.instance) {
      AuthApiService.instance = new AuthApiService();
    }
    return AuthApiService.instance;
  }

  /**
   * Eksekusi login ke backend Laravel.
   */
  public async login(email: string, password: string): Promise<LoginResponse> {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const result: LoginResponse = await res.json();

    if (result.success && result.data) {
      if (typeof window !== "undefined") {
        localStorage.setItem(this.TOKEN_KEY, result.data.token);
        localStorage.setItem(this.USER_KEY, JSON.stringify(result.data.user));
      }
    }

    return result;
  }

  /**
   * Eksekusi logout.
   */
  public async logout(): Promise<void> {
    try {
      const token = this.getToken();
      if (token) {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: {
            "Accept": "application/json",
            "Authorization": `Bearer ${token}`
          }
        });
      }
    } catch {
      // Ignore network failure on logout
    } finally {
      if (typeof window !== "undefined") {
        localStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem(this.USER_KEY);
      }
    }
  }

  public getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(this.TOKEN_KEY);
  }

  public getCurrentUser(): AuthUser | null {
    if (typeof window === "undefined") return null;
    const userStr = localStorage.getItem(this.USER_KEY);
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }

  public isAuthenticated(): boolean {
    return !!this.getToken();
  }

  /**
   * Perbarui profil akun mandiri & password.
   */
  public async updateProfile(data: {
    name: string;
    email: string;
    nip?: string;
    department?: string;
    current_password?: string;
    new_password?: string;
  }): Promise<{ success: boolean; message: string; data?: { user: AuthUser }; errors?: Record<string, string[]> }> {
    const token = this.getToken();
    const currentUser = this.getCurrentUser();

    const res = await fetch("/api/auth/profile", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        ...(currentUser?.email ? { "X-User-Email": currentUser.email } : {}),
      },
      body: JSON.stringify(data),
    });

    const result = await res.json();

    if (result.success && result.data?.user) {
      if (typeof window !== "undefined") {
        localStorage.setItem(this.USER_KEY, JSON.stringify(result.data.user));
      }
    }

    return result;
  }
}

export const authService = AuthApiService.getInstance();
