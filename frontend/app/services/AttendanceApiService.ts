import { AttendanceItem, DashboardSummaryResponse, RequestItem } from "../types/attendance";

const API_BASE_URL = "/api";

export class AttendanceApiService {
  private static instance: AttendanceApiService;

  private constructor() {}

  public static getInstance(): AttendanceApiService {
    if (!AttendanceApiService.instance) {
      AttendanceApiService.instance = new AttendanceApiService();
    }
    return AttendanceApiService.instance;
  }

  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: "application/json",
    };
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("satria_auth_token");
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const userStr = localStorage.getItem("satria_auth_user");
      if (userStr) {
        try {
          const u = JSON.parse(userStr);
          if (u && u.email) headers["X-User-Email"] = u.email;
        } catch {}
      }
    }
    return headers;
  }

  /**
   * Mengambil data dashboard & riwayat absensi secara asynchronous dari Laravel API.
   */
  public async getDashboardData(userEmail?: string): Promise<DashboardSummaryResponse> {
    const headers = this.getAuthHeaders();
    if (userEmail) {
      headers["X-User-Email"] = userEmail;
    }
    const params = new URLSearchParams();
    if (headers["X-User-Email"]) {
      params.append("email", headers["X-User-Email"]);
    }
    const queryString = params.toString() ? `?${params.toString()}` : "";
    const res = await fetch(`${API_BASE_URL}/dashboard${queryString}`, {
      method: "GET",
      headers,
    });

    if (!res.ok) {
      throw new Error(`Gagal memuat data dashboard: ${res.statusText}`);
    }

    return await res.json();
  }

  /**
   * Mengirim request absensi scan QR & lokasi GPS dengan audit metadata (isMock, accuracy, token, device info).
   */
  public async recordAttendance(
    latitude?: number,
    longitude?: number,
    metadata?: {
      isMock?: boolean;
      isWebdriver?: boolean;
      isTrusted?: boolean;
      dwellTimeMs?: number;
      accuracy?: number;
      token?: string;
      deviceFingerprint?: string;
    }
  ): Promise<{ success: boolean; message: string; actionType?: string; attendanceMode?: string; isMock?: boolean; fraudReason?: string; entropyScore?: number; data: AttendanceItem }> {
    const headers = this.getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/attendance/scan`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify({
        latitude,
        longitude,
        user_email: headers["X-User-Email"],
        is_mock: metadata?.isMock ?? false,
        is_webdriver: metadata?.isWebdriver ?? false,
        is_trusted: metadata?.isTrusted ?? true,
        dwell_time_ms: metadata?.dwellTimeMs ?? null,
        accuracy: metadata?.accuracy ?? null,
        token: metadata?.token ?? null,
        device_fingerprint: metadata?.deviceFingerprint ?? null,
      }),
    });

    if (!res.ok) {
      throw new Error(`Gagal mencatat absensi: ${res.statusText}`);
    }

    return await res.json();
  }

  /**
   * Mengambil data QR dinamis untuk Layar Monitor Lobby Pusdatin.
   */
  public async getDynamicQrMonitor(): Promise<{ success: boolean; data: any }> {
    const res = await fetch(`${API_BASE_URL}/qr/monitor`, {
      headers: {
        "Accept": "application/json",
      },
    });

    if (!res.ok) {
      throw new Error("Gagal memuat QR monitor");
    }

    return await res.json();
  }

  public async submitRequest(formData: FormData): Promise<{ success: boolean; message: string; data: RequestItem }> {
    const headers = this.getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/requests`, {
      method: "POST",
      headers: {
        ...headers,
      },
      body: formData,
    });

    if (!res.ok) {
      throw new Error(`Gagal mengirim pengajuan: ${res.statusText}`);
    }

    return await res.json();
  }

  /**
   * Update status persetujuan pengajuan oleh Admin SDM (Disetujui / Ditolak).
   */
  public async updateRequestStatus(id: number, status: "Disetujui" | "Ditolak"): Promise<{ success: boolean; message: string; data: { id: number; status: string } }> {
    const res = await fetch(`${API_BASE_URL}/requests/${id}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({ status }),
    });

    if (!res.ok) {
      throw new Error(`Gagal memperbarui status pengajuan: ${res.statusText}`);
    }

    return await res.json();
  }
}

export const attendanceService = AttendanceApiService.getInstance();
