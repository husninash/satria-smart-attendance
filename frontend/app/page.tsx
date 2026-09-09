"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Award, BarChart3, Bot, Building2, CalendarDays, Check, ChevronDown, ChevronRight, Clock3, Cpu, Download, FileText, Filter, History, Home as HomeIcon, KeyRound, LocateFixed, Lock, LogOut, Mail, MapPin, Monitor, Pencil, PieChart as PieIcon, Plus, Printer, QrCode, RefreshCw, Search, Send, Settings, ShieldAlert, ShieldCheck, Trash2, TrendingUp, User as UserIcon, UserCheck, Users, Wifi, WifiOff, X, Zap } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, Legend as RechartsLegend, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { attendanceService } from "./services/AttendanceApiService";
import { authService, AuthUser } from "./services/AuthApiService";
import { userApiService, UserItem } from "./services/UserApiService";
import { AttendanceItem, AuditLogItem, RequestItem } from "./types/attendance";

import StandaloneMonitorPage from "./StandaloneMonitor";

type View = "home" | "history" | "request" | "profile" | "admin" | "admin-audit" | "admin-approval" | "admin-units" | "admin-users";
type Attendance = AttendanceItem;

// Menu Navigasi Pegawai & Administrator SDM
const navItems = [
  { id: "home" as View, label: "Beranda", icon: HomeIcon },
  { id: "history" as View, label: "Riwayat", icon: History },
  { id: "request" as View, label: "Pengajuan", icon: FileText },
  { id: "profile" as View, label: "Profil Saya", icon: UserIcon },
];

const adminNavItems = [
  { id: "admin-audit" as View, label: "Audit Forensik", icon: ShieldCheck, badgeKey: "anomalies" },
  { id: "admin-approval" as View, label: "Approval Pengajuan", icon: FileText, badgeKey: "approvals" },
  { id: "admin-units" as View, label: "Kehadiran per Unit", icon: Users },
  { id: "admin-users" as View, label: "Data Pegawai", icon: UserCheck },
];

export const PUSDATIN_ORG_STRUCTURE = [
  {
    group: "Pusat Data dan Informasi (Pimpinan)",
    units: [
      "Pusat Data dan Informasi",
    ],
  },
  {
    group: "Bagian Tata Usaha",
    units: [
      "Bagian Tata Usaha",
      "Subbagian Program dan Laporan",
      "Subbagian Administrasi Jabatan Fungsional",
      "Subbagian Umum",
    ],
  },
  {
    group: "Bidang Pengembangan & Pengelolaan Sisfo Pertahanan",
    units: [
      "Bidang Pengembangan dan Pengelolaan Sisfohan",
      "Subbidang Pengembangan dan Pengelolaan Sistem Aplikasi",
      "Subbidang Pengumpulan dan Pengelolaan Data",
      "Subbidang Manajemen Sistem Informasi",
    ],
  },
  {
    group: "Bidang Infrastruktur Teknologi Informasi & Komunikasi",
    units: [
      "Bidang Infrastruktur TIK",
      "Subbidang Perencanaan dan Pengembangan Infrastruktur",
      "Subbidang Operasional dan Layanan Infrastruktur",
      "Subbidang Pemeliharaan Infrastruktur",
    ],
  },
  {
    group: "Bidang Pengamanan Sistem Informasi & Sandi",
    units: [
      "Bidang Pengamanan Sisfo dan Sandi",
      "Subbidang Pengamanan Sistem Informasi",
      "Subbidang Pengawasan dan Evaluasi Pengamanan",
      "Subbidang Operasional Persandian",
    ],
  },
  {
    group: "Kelompok Jabatan Fungsional",
    units: [
      "Kelompok Jabatan Fungsional",
    ],
  },
];

function Brand() { return <div className="brand"><span className="brand-mark"><Check /></span><div><strong>SATRIA</strong><small>Smart Attendance</small></div></div>; }
function StatusBadge({ status }: { status: string }) { const variant = status === "Hadir" || status === "Disetujui" ? "good" : status === "Terlambat" || status === "Menunggu" ? "warn" : "neutral"; return <span className={`status-badge ${variant}`}>{status}</span>; }

export default function AttendanceApp() {
  const [mounted, setMounted] = useState(false);
  const [isKioskMode, setIsKioskMode] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [view, setView] = useState<View>("home");
  const [isAdminOpen, setIsAdminOpen] = useState(true);
  const [scanState, setScanState] = useState<"idle" | "scanning" | "verifying" | "success">("idle");
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [requestType, setRequestType] = useState("Izin");
  const [reason, setReason] = useState("");
  const [notice, setNotice] = useState("");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; accuracy: number; distance: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<string>("Mendeteksi lokasi...");
  const [adminMetrics, setAdminMetrics] = useState<any>(null);
  const [pageLoadTimestamp, setPageLoadTimestamp] = useState<number>(Date.now());
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isAppInstalled, setIsAppInstalled] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    setPageLoadTimestamp(Date.now());
    const saved = authService.getCurrentUser();
    if (saved) {
      setCurrentUser(saved);
    }
    if (typeof window !== "undefined") {
      setIsOnline(navigator.onLine);
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      window.addEventListener("beforeinstallprompt", (e: any) => {
        e.preventDefault();
        setDeferredPrompt(e);
      });

      window.addEventListener("appinstalled", () => {
        setIsAppInstalled(true);
        setDeferredPrompt(null);
      });

      if (window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone) {
        setIsAppInstalled(true);
      }

      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("mode") === "kiosk" || urlParams.get("kiosk") === "true" || window.location.hash === "#kiosk") {
        setIsKioskMode(true);
      }

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, []);

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice && choice.outcome === "accepted") {
        setIsAppInstalled(true);
      }
      setDeferredPrompt(null);
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    setCurrentUser(null);
    setTodayAttendance(null);
    setAttendance([]);
    setRequests([]);
  };

  // Load Data dari Laravel Backend secara Asynchronous & OOP
  const loadDashboardData = async (targetEmail?: string) => {
    try {
      const email = targetEmail || currentUser?.email;
      const data = await attendanceService.getDashboardData(email);
      if (data) {
        setAttendance(data.attendance || []);
        setRequests(data.requests || []);
        setTodayAttendance(data.today || null);
        if ((data as any).auditLogs) {
          setAuditLogs((data as any).auditLogs);
        }
        if ((data as any).adminMetrics) {
          setAdminMetrics((data as any).adminMetrics);
        }
      }
    } catch (err) {
      console.warn("Backend API not reachable, using local fallback state", err);
    }
  };

  useEffect(() => {
    setMounted(true);
    if (currentUser?.email) {
      loadDashboardData(currentUser.email);
    }
  }, [currentUser?.email]);

  // Geolocation Kantor Pusat (Pusdatin Kemhan Pondok Labu)
  const OFFICE_LAT = -6.312961481933643;
  const OFFICE_LNG = 106.79270558954924;

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // meter
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  };

  // Suara Konfirmasi Kedinasan (Harmonious Dual-Tone Chime via Web Audio API)
  const playSuccessChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === "suspended") {
        ctx.resume();
      }
      const now = ctx.currentTime;

      // Nada 1: D5 (587.33 Hz) - nada pembuka jernih
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(587.33, now);
      gain1.gain.setValueAtTime(0.12, now);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.35);

      // Nada 2: A5 (880.00 Hz) - nada konfirmasi kedinasan yang berwibawa & stabil
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(880.00, now + 0.12);
      gain2.gain.setValueAtTime(0.15, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.6);
    } catch (e) {
      console.warn("Audio feedback chime not available:", e);
    }
  };

  const [currentDateTime, setCurrentDateTime] = useState<Date>(new Date());
  const [currentAddress, setCurrentAddress] = useState<string>("Mendeteksi alamat...");

  // Realtime Live Clock (Update setiap detik)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Geolocation Realtime & Reverse Geocoding Nama Lokasi Nyata
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const dist = calculateDistance(lat, lng, OFFICE_LAT, OFFICE_LNG);
          const rawAccuracy = Math.round(position.coords.accuracy);
          // Deteksi Fake GPS / Mock Location provider jika tersedia di browser/webview
          const isMock = Boolean((position.coords as any).isMock || (position as any).mocked || rawAccuracy === 0);
          
          setUserLocation({
            lat: lat,
            lng: lng,
            accuracy: rawAccuracy,
            distance: dist,
            isMock: isMock,
          } as any);
          setLocationStatus(`${dist} m dari Kantor (Akurasi: ±${rawAccuracy}m)${isMock ? ' (Mock GPS Terdeteksi)' : ''}`);

          // Ambil nama wilayah/kelurahan asli dari koordinat GPS (OpenStreetMap Reverse Geocoding)
          try {
            const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`, {
              headers: { "Accept-Language": "id" }
            });
            if (geoRes.ok) {
              const geoData = await geoRes.json();
              const area = geoData.address.suburb || geoData.address.village || geoData.address.city || geoData.address.county || "Sekitar Area";
              setCurrentAddress(`${area} (${dist} m dari Kantor)`);
            }
          } catch (e) {
            setCurrentAddress(`GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)} (${dist} m)`);
          }
        },
        () => {
          setLocationStatus("GPS tidak aktif/diizinkan");
          setCurrentAddress("Izin lokasi belum diberikan");
        },
        { enableHighAccuracy: true }
      );
    }
  }, []);

  const metrics = useMemo(() => {
    const year = currentDateTime.getFullYear();
    const month = String(currentDateTime.getMonth() + 1).padStart(2, '0');
    const currentMonthKey = `${year}-${month}`; // e.g. "2026-09"

    const thisMonthList = attendance.filter(a => {
      if (a.rawDate) return a.rawDate.startsWith(currentMonthKey);
      return true;
    });

    const hasToday = todayAttendance && (!thisMonthList.some(a => a.rawDate === `${year}-${month}-${String(currentDateTime.getDate()).padStart(2, '0')}`));

    return {
      present: thisMonthList.filter(a => a.status === "Hadir" || a.status === "Terlambat").length + (hasToday ? 1 : 0),
      late: thisMonthList.filter(a => a.status === "Terlambat").length + (hasToday && todayAttendance.status === "Terlambat" ? 1 : 0)
    };
  }, [attendance, todayAttendance, currentDateTime]);

  const startScan = async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      alert("Koneksi jaringan terputus. Presensi SATRIA wajib dilakukan secara online dan terhubung ke infrastruktur Pusdatin Kemhan.");
      return;
    }

    const isAlreadyCheckedIn = todayAttendance && todayAttendance.inTime && todayAttendance.inTime !== "—" && todayAttendance.inTime !== "--:--";
    const isAlreadyCheckedOut = todayAttendance && todayAttendance.outTime && todayAttendance.outTime !== "—" && todayAttendance.outTime !== "--:--";

    // 1. Jika sudah lengkap check-in & check-out
    if (isAlreadyCheckedIn && isAlreadyCheckedOut) {
      setScanState("success");
      setNotice("Presensi hari ini sudah lengkap (Masuk & Pulang telah tercatat).");
      return;
    }

    // 2. Buka Modal Konfirmasi Presensi (Masuk atau Pulang)
    setScanState("scanning");
    setNotice("");
  };

  const handleVerifyKioskCode = async (code: string, event?: any) => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setScanState("idle");
      alert("Koneksi jaringan terputus. Presensi SATRIA wajib dilakukan secara online dan terhubung ke infrastruktur Pusdatin Kemhan.");
      return;
    }

    setScanState("verifying");
    const isWebdriver = typeof navigator !== "undefined" && Boolean((navigator as any).webdriver);
    const dwellTimeMs = Date.now() - pageLoadTimestamp;
    const isTrusted = event ? event.isTrusted !== false : true;

    try {
      const response = await attendanceService.recordAttendance(
        userLocation?.lat,
        userLocation?.lng,
        {
          token: code,
          isMock: false,
          isWebdriver: isWebdriver,
          isTrusted: isTrusted,
          dwellTimeMs: dwellTimeMs,
          accuracy: userLocation?.accuracy ?? undefined,
        }
      );
      setScanState("success");
      playSuccessChime();
      setNotice(response.message || "Presensi berhasil dicatat.");
      if (response.data) {
        setTodayAttendance((prev: any) => ({
          inTime: response.data.inTime,
          outTime: response.data.outTime,
          inTimeExact: response.data.inTimeExact,
          outTimeExact: response.data.outTimeExact,
          status: response.data.status || "Hadir",
          distance: response.data.distance,
          attendanceMode: response.data.attendanceMode,
          isMockLocation: response.data.isMockLocation,
          fraudReason: response.data.fraudReason,
          entropyScore: response.data.entropyScore,
        }));
      }
      await loadDashboardData();
    } catch (err: any) {
      setScanState("scanning");
      throw err;
    }
  };

  const handleSimulateBotAttack = async () => {
    try {
      await attendanceService.recordAttendance(
        userLocation?.lat || -6.3129,
        userLocation?.lng || 106.7927,
        {
          token: "PUPPETEER_BOT_TEST_PAYLOAD",
          isMock: true,
          isWebdriver: true,
          isTrusted: false,
          dwellTimeMs: 140, // 140ms
          accuracy: 0,
        }
      );
      await loadDashboardData();
    } catch (err) {
      console.warn("Gagal simulasi bot attack:", err);
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitRequest = async (e: React.FormEvent, selectedFile?: File | null) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!reason.trim()) {
      setNotice("Isi alasan pengajuan terlebih dahulu.");
      return;
    }

    setIsSubmitting(true);
    const todayIso = new Date().toISOString().split("T")[0];

    try {
      const formData = new FormData();
      formData.append("type", requestType);
      formData.append("start_date", todayIso);
      formData.append("end_date", todayIso);
      formData.append("reason", reason);
      if (selectedFile) {
        formData.append("attachment", selectedFile);
      }

      const res = await attendanceService.submitRequest(formData);
      setRequests(prev => [res.data, ...prev]);
      setReason("");
      setNotice(res.message);
    } catch (err) {
      const todayFormatted = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
      setRequests(prev => [{ id: Date.now(), type: requestType, dates: todayFormatted, reason, status: "Menunggu" }, ...prev]);
      setReason("");
      setNotice("Pengajuan berhasil dikirim kepada Atasan Unit.");
    } finally {
      setIsSubmitting(false);
    }
  };
  const title = {
    home: "Beranda",
    history: "Riwayat Kehadiran",
    request: "Pengajuan",
    profile: "Pengaturan Profil Pegawai",
    admin: "Audit Keaslian Presensi",
    "admin-audit": "Audit Keaslian Presensi",
    "admin-approval": "Verifikasi & Approval Pengajuan",
    "admin-units": "Monitoring Kehadiran per Unit",
    "admin-users": "Manajemen Data Pegawai",
    monitor: "Layar QR Monitor Lobby"
  }[view] || "Sistem Presensi";

  // Dynamic Date Formatter
  const formattedFullDate = currentDateTime.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const hour = currentDateTime.getHours();
  const greeting = hour < 11 ? "Selamat pagi" : hour < 15 ? "Selamat siang" : hour < 18 ? "Selamat sore" : "Selamat malam";

  // Cegah Hydration Mismatch antara SSR server dan client
  if (!mounted) {
    return null;
  }

  // Jika URL dibuka untuk TV Monitor Lobby (?mode=kiosk), render StandaloneMonitorPage secara terisolasi
  if (isKioskMode) {
    return <StandaloneMonitorPage />;
  }

  if (!currentUser) {
    return <LoginView onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

  const handleApprovalAction = async (id: number, status: "Disetujui" | "Ditolak") => {
    try {
      await attendanceService.updateRequestStatus(id, status);
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    } catch {
      // Fallback local state
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    }
  };

  return (
    <div className="app-shell-container">
      {/* Desktop / Tablet Sidebar */}
      <aside className="app-sidebar">
        <div className="app-sidebar-inner">
          <Brand />
          <nav className="sidebar-nav">
            <span className="sidebar-section-title">Menu Pegawai</span>
            {navItems.map(item => (
              <button
                key={item.id}
                className={`sidebar-nav-btn ${view === item.id ? "active" : ""}`}
                onClick={() => { setView(item.id); setScanState("idle"); }}
              >
                <item.icon />
                <span>{item.label}</span>
              </button>
            ))}

            {(currentUser.isAdmin || currentUser.roles?.includes("admin")) && (
              <div style={{ marginTop: 14 }}>
                <button
                  type="button"
                  className={`sidebar-nav-btn ${view.startsWith("admin") ? "active" : ""}`}
                  onClick={() => {
                    setIsAdminOpen(prev => !prev);
                    if (!view.startsWith("admin")) {
                      setView("admin-audit");
                      setScanState("idle");
                    }
                  }}
                  style={{ justifyContent: "space-between" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <ShieldCheck />
                    <span>Laman Admin</span>
                  </div>
                  {isAdminOpen ? <ChevronDown className="w-4 h-4 opacity-70" /> : <ChevronRight className="w-4 h-4 opacity-70" />}
                </button>

                {isAdminOpen && (
                  <div className="sidebar-subnav">
                    {adminNavItems.map(item => {
                      const isActive = view === item.id || (view === "admin" && item.id === "admin-audit");
                      const anomalyCount = auditLogs.filter(l => l.isMockLocation).length;
                      const pendingCount = requests.filter(r => r.status === "Menunggu").length;
                      const badge = item.badgeKey === "anomalies" && anomalyCount > 0
                        ? { text: anomalyCount, type: "badge-danger" }
                        : item.badgeKey === "approvals" && pendingCount > 0
                        ? { text: pendingCount, type: "badge-warn" }
                        : null;

                      return (
                        <button
                          key={item.id}
                          className={`sidebar-subnav-btn ${isActive ? "active" : ""}`}
                          onClick={() => { setView(item.id); setScanState("idle"); }}
                        >
                          <item.icon />
                          <span>{item.label}</span>
                          {badge && (
                            <span className={`sidebar-badge ${badge.type}`}>
                              {badge.text}
                            </span>
                          )}
                        </button>
                      );
                    })}
                    <a
                      href="/?mode=kiosk"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="sidebar-subnav-btn"
                      title="Buka Layar Kode QR Monitor Lobby di tab/jendela baru"
                      style={{ textDecoration: "none" }}
                    >
                      <Monitor className="w-4 h-4 text-teal-600" />
                      <span>Monitor TV Lobby</span>
                      <span style={{ marginLeft: "auto", fontSize: "0.68rem", background: "rgba(15, 118, 110, 0.1)", color: "#0f766e", padding: "1px 6px", borderRadius: 4, fontWeight: 600 }}>
                        Layar ↗
                      </span>
                    </a>
                  </div>
                )}
              </div>
            )}
          </nav>
        </div>
        <div className="sidebar-bottom">
          <div
            className={`user-card ${view === "profile" ? "active-user-card" : ""}`}
            onClick={() => { setView("profile"); setScanState("idle"); }}
            style={{ cursor: "pointer", transition: "all 0.15s ease" }}
            title="Klik untuk membuka Pengaturan Profil Anda"
          >
            <span>{currentUser.name.slice(0, 2).toUpperCase()}</span>
            <div>
              <strong>{currentUser.name}</strong>
              <small>{currentUser.role} • {currentUser.department}</small>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleLogout();
              }}
              title="Keluar (Logout)"
              className="logout-btn-icon"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Screen & Header */}
      <div className="app-shell">
        <header className="topbar">
          <div className="topbar-title">
            <div>
              <p>{formattedFullDate}</p>
              <h1>{title}</h1>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {/* Status Jaringan Kemhan */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 10px",
                borderRadius: 20,
                fontSize: "0.74rem",
                fontWeight: 600,
                background: isOnline ? "rgba(16, 185, 129, 0.12)" : "rgba(244, 63, 94, 0.12)",
                color: isOnline ? "#047857" : "#be123c",
                border: isOnline ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid rgba(244, 63, 94, 0.3)",
              }}
              title={
                isOnline
                  ? "Terhubung ke Jaringan Intranet Pusdatin Kemhan (Siap Presensi)"
                  : "Koneksi jaringan terputus. Presensi SATRIA wajib dilakukan secara online."
              }
            >
              {isOnline ? (
                <Wifi className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-rose-600" />
              )}
              <span>{isOnline ? "Intranet Kemhan Aktif" : "Offline (Wajib Online)"}</span>
            </div>

            {/* Tombol Install Aplikasi PWA (Bila didukung browser dan belum diinstall) */}
            {deferredPrompt && !isAppInstalled && (
              <button
                type="button"
                onClick={handleInstallApp}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "5px 12px",
                  borderRadius: 8,
                  fontSize: "0.76rem",
                  fontWeight: 600,
                  background: "linear-gradient(135deg, #0f766e 0%, #0d9488 100%)",
                  color: "#ffffff",
                  border: "none",
                  cursor: "pointer",
                  boxShadow: "0 2px 6px rgba(13, 148, 136, 0.25)",
                  transition: "all 0.15s ease",
                }}
                title="Install SATRIA ke Layar Utama HP / Desktop"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Install Aplikasi</span>
              </button>
            )}
          </div>
        </header>
        <main className="content-area">
          {view === "home" && (
            <HomeView
              currentUser={currentUser}
              scanState={scanState}
              startScan={startScan}
              notice={notice}
              today={todayAttendance}
              metrics={metrics}
              locationStatus={currentAddress}
              userLocation={userLocation}
              currentDateTime={currentDateTime}
              greeting={greeting}
              onNavigate={setView}
              onClose={() => setScanState("idle")}
              onVerifyCode={handleVerifyKioskCode}
            />
          )}
          {view === "history" && <HistoryView attendance={attendance} currentDateTime={currentDateTime} />}
          {view === "request" && (
            <RequestView
              requests={requests}
              requestType={requestType}
              setRequestType={setRequestType}
              reason={reason}
              setReason={setReason}
              notice={notice}
              isSubmitting={isSubmitting}
              submit={submitRequest}
            />
          )}
          {view === "profile" && currentUser && (
            <ProfileView
              currentUser={currentUser}
              onUpdateUser={(updated) => {
                setCurrentUser(updated);
              }}
              isAppInstalled={isAppInstalled}
              canInstallApp={Boolean(deferredPrompt && !isAppInstalled)}
              onInstallApp={handleInstallApp}
            />
          )}
          {(view === "admin" || view === "admin-audit" || view === "admin-approval" || view === "admin-units" || view === "admin-users") && (
            <AdminView
              initialTab={view === "admin-approval" ? "approval" : view === "admin-units" ? "units" : view === "admin-users" ? "users" : "audit"}
              onTabChange={(tab) => {
                if (tab === "audit") setView("admin-audit");
                else if (tab === "approval") setView("admin-approval");
                else if (tab === "units") setView("admin-units");
                else if (tab === "users") setView("admin-users");
              }}
              requests={requests}
              auditLogs={auditLogs}
              adminMetrics={adminMetrics}
              onApprovalAction={handleApprovalAction}
              onSimulateBot={handleSimulateBotAttack}
              onRefreshData={loadDashboardData}
            />
          )}
        </main>
        <nav className="mobile-nav" aria-label="Navigasi utama">
          {navItems.map(item => (
            <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => { setView(item.id); setScanState("idle"); }}>
              <item.icon/>
              <span>{item.label}</span>
            </button>
          ))}
          {(currentUser?.isAdmin || currentUser?.roles?.includes("admin")) && (
            <button
              className={view.startsWith("admin") ? "active" : ""}
              onClick={() => { setView("admin-audit"); setScanState("idle"); }}
            >
              <ShieldCheck />
              <span>Admin</span>
            </button>
          )}
        </nav>
      </div>
    </div>
  );
}

function HomeView({ currentUser, scanState, startScan, notice, today, metrics, locationStatus, userLocation, currentDateTime, greeting, officeName = "Pusdatin Kemhan", onNavigate, onClose, onVerifyCode }: any) {
  const isCheckout = Boolean(today?.inTime && today.inTime !== "—" && (!today?.outTime || today.outTime === "—"));
  if (scanState !== "idle") return <ScanExperience state={scanState} notice={notice} userLocation={userLocation} officeName={officeName} onClose={onClose} onVerifyCode={onVerifyCode} isCheckout={isCheckout} />;

  const currentDayNumber = currentDateTime ? currentDateTime.getDate() : new Date().getDate();
  const currentMonthShort = currentDateTime ? currentDateTime.toLocaleDateString("id-ID", { month: "short" }).toUpperCase() : "AGU";
  const currentMonthLong = currentDateTime ? currentDateTime.toLocaleDateString("id-ID", { month: "long" }) : "Bulan Ini";
  const liveLiveTime = currentDateTime ? currentDateTime.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false }) : "--:--";

  return (
    <div className="page-stack">
      <section className="welcome">
        <div>
          <p>{greeting},</p>
          <h2>{currentUser?.name || "Pegawai SATRIA"}</h2>
          <span>Jangan lupa mencatat kehadiranmu tepat waktu.</span>
        </div>
        <div className="date-orbit">
          <strong>{currentDayNumber}</strong>
          <span>{currentMonthShort}</span>
        </div>
      </section>

      <div className="dashboard-grid">
        <section className="attendance-card">
          <div className="card-top">
            <div>
              <span className="eyebrow">STATUS HARI INI</span>
              <h3>
                {!today?.inTime || today.inTime === "—"
                  ? "Belum Check-In Masuk"
                  : !today?.outTime || today.outTime === "—"
                  ? "Sudah Masuk (Belum Pulang)"
                  : "Presensi Lengkap (Sudah Pulang)"}
              </h3>
            </div>
            <StatusBadge status={today?.status ?? "Belum absen"}/>
          </div>

          {/* Jam Masuk & Jam Pulang Grid */}
          <div className="check-time-grid">
            <div className="check-time-col">
              <span className="check-label">Jam Masuk</span>
              <div className="time-display-sub">
                <strong>{today?.inTimeExact || today?.inTime || "--:--:--"}</strong>
                <span>WIB</span>
              </div>
            </div>
            <div className="check-time-divider"></div>
            <div className="check-time-col">
              <span className="check-label">Jam Pulang</span>
              <div className="time-display-sub">
                <strong>{today?.outTimeExact || today?.outTime || "--:--:--"}</strong>
                <span>WIB</span>
              </div>
            </div>
          </div>

          {/* Dynamic Button Action */}
          <button
            type="button"
            className={`scan-button cursor-pointer ${today?.inTime && today.inTime !== "—" && (!today?.outTime || today.outTime === "—") ? "btn-checkout" : ""}`}
            onClick={(e) => {
              e.preventDefault();
              startScan();
            }}
          >
            <ShieldCheck className="w-4 h-4"/>
            <span>
              {!today?.inTime || today.inTime === "—"
                ? "Presensi Masuk"
                : !today?.outTime || today.outTime === "—"
                ? "Presensi Pulang"
                : "Presensi Hari Ini Selesai"}
            </span>
          </button>
        </section>

        <section className="side-cards">
          <article>
            <div className="icon-box"><Clock3/></div>
            <div>
              <span>Jadwal kerja</span>
              <strong>06:50 – 15:30</strong>
              <small>Toleransi 15 menit (07:05)</small>
            </div>
          </article>
          <article>
            <div className="icon-box"><CalendarDays/></div>
            <div>
              <span>Kehadiran {currentMonthLong}</span>
              <strong>{metrics.present} hari</strong>
              <small>{metrics.late} kali terlambat</small>
            </div>
          </article>
        </section>
      </div>

      <section className="quick-grid">
        <button
          type="button"
          className="cursor-pointer"
          onClick={(e) => {
            e.preventDefault();
            onNavigate("history");
          }}
        >
          <History/>
          <div>
            <strong>Lihat riwayat</strong>
            <span>Periksa catatan kehadiran</span>
          </div>
          <ChevronRight/>
        </button>
        <button
          type="button"
          className="cursor-pointer"
          onClick={(e) => {
            e.preventDefault();
            onNavigate("request");
          }}
        >
          <FileText/>
          <div>
            <strong>Buat pengajuan</strong>
            <span>Izin, sakit, cuti, atau koreksi</span>
          </div>
          <ChevronRight/>
        </button>
      </section>
    </div>
  );
}

function ScanExperience({ state, notice, userLocation, officeName = "Pusdatin Kemhan", onClose, onVerifyCode, isCheckout = false }: any) {
  const [inputCode, setInputCode] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inputCode.trim().replace(/[\s-]/g, "").toUpperCase();
    if (!clean) {
      setErrorMessage("Silakan masukkan 6-digit kode angka / token yang tampil di Layar TV Lobi.");
      return;
    }
    setErrorMessage("");
    setIsSubmitting(true);
    try {
      if (onVerifyCode) {
        await onVerifyCode(clean, e);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Kode dinamis yang Anda masukkan salah atau sudah kedaluwarsa.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="scan-workspace">
      <button className="close-scan" onClick={onClose} aria-label="Tutup pemindai"><X/></button>
      
      {state === "scanning" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", maxWidth: 400, margin: "0 auto", textAlign: "center" }}>
          {/* Icon */}
          <div style={{ width: 62, height: 62, borderRadius: "50%", background: "linear-gradient(135deg, #0d9488 0%, #0284c7 100%)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 25px rgba(13, 148, 136, 0.45)", marginBottom: 14 }}>
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>

          <h2 style={{ fontSize: "1.35rem", fontWeight: 700, color: "#fff", marginBottom: 4 }}>
            {isCheckout ? "Presensi Pulang (Check-Out)" : "Presensi Masuk (Check-In)"}
          </h2>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.82rem", color: "#10b981", fontWeight: 500, marginBottom: 18 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981", display: "inline-block" }}></span>
            <span>Jaringan Terhubung ({officeName})</span>
          </div>

          <form onSubmit={handleSubmitCode} style={{ width: "100%", textAlign: "left" }}>
            <label style={{ display: "block", fontSize: "0.82rem", color: "#cbd5e1", fontWeight: 600, marginBottom: 8 }}>
              🔢 Masukkan Kode Dinamis / TOTP dari Layar TV Lobi:
            </label>
            <input
              type="text"
              value={inputCode}
              onChange={(e) => {
                setInputCode(e.target.value);
                if (errorMessage) setErrorMessage("");
              }}
              placeholder="Contoh: 974201 atau 974-201"
              maxLength={20}
              autoFocus
              style={{
                width: "100%",
                padding: "13px 14px",
                fontSize: "1.25rem",
                fontWeight: 700,
                letterSpacing: "3px",
                textAlign: "center",
                borderRadius: 12,
                border: errorMessage ? "1.5px solid #ef4444" : "1.5px solid #334155",
                background: "#09101f",
                color: "#38bdf8",
                outline: "none",
                fontFamily: "monospace",
                marginBottom: 6,
                boxSizing: "border-box",
              }}
            />
            {errorMessage ? (
              <p style={{ color: "#ef4444", fontSize: "0.78rem", marginBottom: 12 }}>{errorMessage}</p>
            ) : (
              <p style={{ color: "#94a3b8", fontSize: "0.75rem", marginBottom: 14 }}>
                Bisa diketik langsung 6 angka tanpa tanda strip (-), contoh: <strong>974201</strong>.
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                width: "100%",
                padding: "13px 20px",
                borderRadius: 12,
                background: "linear-gradient(135deg, #059669 0%, #0d9488 100%)",
                color: "#fff",
                fontWeight: 600,
                fontSize: "0.98rem",
                border: "none",
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(5, 150, 105, 0.35)",
                transition: "all 0.15s ease",
              }}
            >
              {isSubmitting ? "Memverifikasi..." : (isCheckout ? "Konfirmasi Presensi Pulang" : "Konfirmasi Presensi Masuk")}
            </button>
          </form>

          {/* Akses Cepat */}
          <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", fontSize: "0.8rem", paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <a
              href="/?view=monitor"
              target="_blank"
              rel="noreferrer"
              style={{ color: "#2dd4bf", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 500 }}
              title="Buka layar TV monitor lobi di tab baru untuk melihat kode yang aktif"
            >
              🖥️ Lihat Layar TV Lobi ↗
            </a>
            <button
              type="button"
              onClick={async (e) => {
                setIsSubmitting(true);
                try {
                  if (onVerifyCode) await onVerifyCode("WIFI_VERIFIED", e);
                } catch (err: any) {
                  setErrorMessage(err.message || "Gagal verifikasi jaringan.");
                } finally {
                  setIsSubmitting(false);
                }
              }}
              style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", textDecoration: "underline", fontSize: "0.78rem" }}
              title="Gunakan ini jika berada di kantor tanpa melihat layar TV"
            >
              Bypass (Verifikasi WiFi)
            </button>
          </div>
        </div>
      )}

      {state === "verifying" && (
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <div className="radar"><ShieldCheck className="w-10 h-10 text-emerald-400"/></div>
          <h2 style={{ fontSize: "1.25rem", color: "#fff", marginTop: 12 }}>Memproses Presensi...</h2>
          <p style={{ color: "#94a3b8", fontSize: "0.85rem", margin: "6px 0 0 0" }}>Mohon tunggu sebentar</p>
        </div>
      )}

      {state === "success" && (
        <>
          <div className="success-ring"><Check/></div>
          <h2>Presensi Berhasil Dicatat</h2>
          <p>{notice}</p>
          <Button onClick={onClose} style={{ marginTop: 24, padding: "12px 28px", borderRadius: 12 }}>
            Kembali ke Beranda
          </Button>
        </>
      )}
    </section>
  );
}

function LoginView({ onLoginSuccess }: { onLoginSuccess: (user: AuthUser) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMsg("Email / NIP dan password wajib diisi.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await authService.login(email, password);
      if (res.success && res.data) {
        onLoginSuccess(res.data.user);
        return;
      } else {
        setErrorMsg(res.message || "Email atau password yang Anda masukkan salah.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal menghubungi server backend.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-blob login-blob-1"></div>
      <div className="login-blob login-blob-2"></div>

      <div className="login-card">
        <div className="login-brand">
          <div className="login-logo-box">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="login-title">
            <h1>SATRIA</h1>
            <p>Pusdatin Kemhan</p>
          </div>
        </div>

        {errorMsg && (
          <div className="login-error-msg flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-field">
            <label>Email atau NIP Pegawai</label>
            <div className="form-input-wrap">
              <Mail className="form-input-icon" />
              <input
                type="text"
                className="form-input"
                placeholder="nama@satria.id atau NIP"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-field">
            <label>Kata Sandi (Password)</label>
            <div className="form-input-wrap">
              <Lock className="form-input-icon" />
              <input
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? "Memverifikasi..." : "Masuk ke Sistem SATRIA"}
          </button>
        </form>
      </div>
    </div>
  );
}

function HistoryView({ attendance, currentDateTime }: { attendance: Attendance[]; currentDateTime?: Date }) {
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = currentDateTime || new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [filter, setFilter] = useState("Semua");

  // Filter kehadiran berdasarkan bulan yang dipilih
  const monthlyRecords = useMemo(() => {
    return attendance.filter(a => {
      if (a.rawDate) return a.rawDate.startsWith(selectedMonth);
      return true;
    });
  }, [attendance, selectedMonth]);

  const rows = filter === "Semua" ? monthlyRecords : monthlyRecords.filter(a => a.status === filter);

  // Perhitungan dinamis per bulan (OOP data calculation)
  const stats = useMemo(() => {
    const presentCount = monthlyRecords.filter(a => a.status === "Hadir").length;
    const lateCount = monthlyRecords.filter(a => a.status === "Terlambat").length;
    const permitCount = monthlyRecords.filter(a => a.status === "Dinas luar" || a.status === "Izin" || a.status === "Sakit").length;
    return {
      present: presentCount,
      late: lateCount,
      permit: permitCount,
      totalWorkingDays: 22,
    };
  }, [monthlyRecords]);

  // Generate Hari Kalender untuk Visualisasi
  const [yearStr, monthStr] = selectedMonth.split("-");
  const year = parseInt(yearStr);
  const monthIndex = parseInt(monthStr) - 1;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, monthIndex, 1).getDay(); // 0 = Minggu

  const calendarDays = useMemo(() => {
    const days = [];
    // Padding hari kosong sebelum tanggal 1
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push({ empty: true });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const record = attendance.find(a => a.rawDate === dateKey);
      const isWeekend = new Date(year, monthIndex, d).getDay() === 0 || new Date(year, monthIndex, d).getDay() === 6;
      days.push({
        empty: false,
        day: d,
        dateKey,
        record,
        isWeekend,
        status: record?.status || (isWeekend ? "Libur" : "Belum ada catatan")
      });
    }
    return days;
  }, [attendance, year, monthIndex, daysInMonth, firstDayOfWeek]);

  const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const currentMonthLabel = `${monthNames[monthIndex]} ${year}`;

  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const handleExportOfficialPdf = async () => {
    try {
      setIsExportingPdf(true);
      await attendanceService.downloadOfficialPdf(selectedMonth);
    } catch (err: any) {
      alert(err.message || "Gagal mengunduh dokumen PDF resmi.");
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="page-stack">
      {/* Month Switcher & Export Toolbar */}
      <div className="history-toolbar">
        <div>
          <span className="eyebrow">PERIODE BULANAN</span>
          <h2 className="text-xl font-bold text-slate-800">{currentMonthLabel}</h2>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="month-select-trigger">
              <CalendarDays className="w-4 h-4 mr-2 text-teal-700"/>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2026-09">September 2026</SelectItem>
              <SelectItem value="2026-08">Agustus 2026</SelectItem>
              <SelectItem value="2026-07">Juli 2026</SelectItem>
            </SelectContent>
          </Select>

          {/* Tombol Unduh Laporan Resmi Format PDF (Berlogo Pusdatin Kemhan) */}
          <button
            type="button"
            onClick={handleExportOfficialPdf}
            disabled={isExportingPdf}
            className="export-btn export-pdf"
            title="Unduh Laporan Resmi Format PDF (Berlogo Pusdatin Kemhan)"
            style={{
              background: "linear-gradient(135deg, #881337 0%, #9f1239 100%)",
              color: "#ffffff",
              border: "1px solid #9f1239",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 14px",
              borderRadius: 8,
              fontSize: "0.82rem",
              fontWeight: 600,
              cursor: isExportingPdf ? "not-allowed" : "pointer",
              boxShadow: "0 2px 6px rgba(136, 19, 55, 0.25)",
              transition: "all 0.15s ease",
            }}
          >
            <FileText className="w-4 h-4 text-rose-200" />
            <span>{isExportingPdf ? "Membuat PDF..." : "Ekspor PDF Resmi (Kemhan)"}</span>
          </button>

          {/* Tombol Ekspor CSV / Excel */}
          <a
            href={`/api/export/csv?month=${selectedMonth}`}
            download
            className="export-btn export-excel"
            title="Unduh Rekap Laporan Format Excel (.CSV)"
          >
            <FileText className="w-4 h-4 text-emerald-600" />
            <span>Unduh Excel</span>
          </a>
        </div>
      </div>

      {/* Dynamic Summary Strip */}
      <section className="summary-strip">
        <div>
          <span>Hadir Tepat Waktu</span>
          <strong>{stats.present}</strong>
          <small>hari kerja tercatat</small>
        </div>
        <div>
          <span>Terlambat</span>
          <strong>{stats.late}</strong>
          <small>hari perlu evaluasi</small>
        </div>
        <div>
          <span>Izin / Dinas Luar</span>
          <strong>{stats.permit}</strong>
          <small>telah disetujui</small>
        </div>
      </section>

      {/* Visualisasi Kalender Kehadiran Interaktif */}
      <section className="data-card calendar-card">
        <div className="section-head">
          <div>
            <span className="eyebrow">VISUALISASI KALENDER</span>
            <h2>Peta Kehadiran Harian</h2>
          </div>
          <div className="calendar-legend">
            <span className="leg-item"><span className="dot dot-hadir"></span> Hadir</span>
            <span className="leg-item"><span className="dot dot-late"></span> Terlambat</span>
            <span className="leg-item"><span className="dot dot-dinas"></span> Dinas / Izin</span>
            <span className="leg-item"><span className="dot dot-off"></span> Libur</span>
          </div>
        </div>

        <div className="calendar-matrix">
          {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((wd, i) => (
            <div key={wd} className={`cal-weekday ${i === 0 || i === 6 ? "text-rose-500" : ""}`}>
              {wd}
            </div>
          ))}
          {calendarDays.map((item, idx) => {
            if (item.empty) return <div key={`empty-${idx}`} className="cal-cell empty"></div>;
            
            const cellClass = item.record?.status === "Hadir"
              ? "cell-hadir"
              : item.record?.status === "Terlambat"
              ? "cell-late"
              : item.record?.status === "Dinas luar" || item.record?.status === "Izin"
              ? "cell-dinas"
              : item.isWeekend
              ? "cell-weekend"
              : "cell-blank";

            return (
              <div
                key={item.dateKey}
                className={`cal-cell ${cellClass}`}
                title={`${item.day} ${monthNames[monthIndex]}: ${item.status} ${item.record?.inTime ? `(${item.record.inTime})` : ''}`}
              >
                <span className="cal-day-num">{item.day}</span>
                {item.record?.inTime && (
                  <span className="cal-time-pill">{item.record.inTime}</span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Tabel Rincian Data */}
      <section className="data-card">
        <div className="section-head">
          <div>
            <span className="eyebrow">LOG PRESENSI</span>
            <h2>Daftar Catatan Kehadiran</h2>
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="filter-select"><SelectValue/></SelectTrigger>
            <SelectContent>
              <SelectItem value="Semua">Semua status</SelectItem>
              <SelectItem value="Hadir">Hadir</SelectItem>
              <SelectItem value="Terlambat">Terlambat</SelectItem>
              <SelectItem value="Dinas luar">Dinas luar</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {rows.length === 0 ? (
          <div className="empty-state-card">
            <CalendarDays className="w-10 h-10 text-slate-300 mx-auto mb-2"/>
            <p className="text-slate-500 text-sm">Belum ada catatan presensi untuk filter bulan ini.</p>
          </div>
        ) : (
          <>
            {/* Mobile View: Modern Card List */}
            <div className="mobile-history-list">
              {rows.map((row, idx) => (
                <div key={idx} className="history-mobile-item">
                  <div className="history-item-top">
                    <div>
                      <strong className="date-main">{row.date}</strong>
                      <span className="day-sub">{row.day}</span>
                    </div>
                    <StatusBadge status={row.status} />
                  </div>
                  <div className="history-item-grid">
                    <div>
                      <span className="time-lbl">Jam Masuk</span>
                      <strong className="time-val">{row.inTime}</strong>
                    </div>
                    <div>
                      <span className="time-lbl">Jam Pulang</span>
                      <strong className="time-val">{row.outTime}</strong>
                    </div>
                    <div>
                      <span className="time-lbl">Lokasi</span>
                      <span className="loc-val">{row.distance}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop View: Full Table */}
            <div className="desktop-table-wrap">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Masuk</TableHead>
                    <TableHead>Pulang</TableHead>
                    <TableHead>Lokasi & Jarak</TableHead>
                    <TableHead>Mode & Audit</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(row => (
                    <TableRow key={row.id || row.date}>
                      <TableCell><strong>{row.date}</strong><small>{row.day}</small></TableCell>
                      <TableCell>
                        <span title={row.inTimeExact ? `Waktu Presisi: ${row.inTimeExact} WIB` : undefined}>
                          {row.inTimeExact || row.inTime}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span title={row.outTimeExact ? `Waktu Presisi: ${row.outTimeExact} WIB` : undefined}>
                          {row.outTimeExact || row.outTime}
                        </span>
                      </TableCell>
                      <TableCell>Pusdatin Kemhan • {row.distance}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded ${row.attendanceMode === 'WFH' ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-700'}`}>
                            {row.attendanceMode || 'WFO'}
                          </span>
                          {row.isMockLocation ? (
                            <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200" title="Terdeteksi sinyal Mock GPS / Akurasi 0">
                              Mock GPS
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200" title="GPS Riil Terverifikasi">
                              Sah
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell><StatusBadge status={row.status}/></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function RequestView({ requests, requestType, setRequestType, reason, setReason, notice, isSubmitting, submit }: any) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submit(e, selectedFile);
  };

  return (
    <div className="request-layout">
      <section className="form-card">
        <div className="section-head">
          <div>
            <span className="eyebrow">FORMULIR PEGAWAI</span>
            <h2>Buat pengajuan baru</h2>
          </div>
        </div>
        <form onSubmit={handleFormSubmit}>
          <label>
            Jenis pengajuan
            <Select value={requestType} onValueChange={setRequestType}>
              <SelectTrigger className="full-select"><SelectValue/></SelectTrigger>
              <SelectContent>
                {["WFH (Work From Home)","Izin","Sakit","Cuti","Dinas luar","Koreksi absensi"].map(x => (
                  <SelectItem key={x} value={x}>{x}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <div className="date-fields">
            <label>Tanggal mulai<Input type="date" defaultValue="2026-09-01"/></label>
            <label>Tanggal selesai<Input type="date" defaultValue="2026-09-01"/></label>
          </div>

          <label>
            Alasan
            <Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Jelaskan alasan pengajuan…"/>
          </label>

          <div className="file-upload-section">
            <span className="upload-label">Lampiran pendukung (Opsional)</span>
            <label className={`custom-dropzone ${selectedFile ? "has-file" : ""}`}>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                className="hidden-file-input"
              />
              <div className="dropzone-content">
                <div className="upload-icon-wrapper">
                  {selectedFile ? <Check className="w-5 h-5 text-emerald-600" /> : <FileText className="w-5 h-5 text-teal-600" />}
                </div>
                <div className="upload-text-group">
                  {selectedFile ? (
                    <>
                      <strong className="file-name-text">{selectedFile.name}</strong>
                      <span className="file-hint-text">{(selectedFile.size / 1024).toFixed(1)} KB • Klik untuk ganti file</span>
                    </>
                  ) : (
                    <>
                      <strong className="file-prompt-text">
                        <span className="text-teal-700 underline font-semibold">Pilih file</span> atau tarik ke sini
                      </strong>
                      <span className="file-hint-text">Format PDF, JPG, atau PNG (Maks. 5MB)</span>
                    </>
                  )}
                </div>
              </div>
            </label>
          </div>

          <div className="approval-route">
            <ShieldCheck/>
            <span>Akan dikirim kepada <strong>Atasan Unit</strong> untuk diperiksa.</span>
          </div>

          <Button type="submit" className="submit-button" disabled={isSubmitting}>
            <Send/>{isSubmitting ? "Mengirimkan Pengajuan..." : "Kirim pengajuan"}
          </Button>
          {notice && <p className="form-notice">{notice}</p>}
        </form>
      </section>

      <section className="request-list">
        <div className="section-head">
          <div>
            <span className="eyebrow">AKTIVITAS</span>
            <h2>Pengajuan terakhir</h2>
          </div>
        </div>
        {requests.map((r: RequestItem) => (
          <article key={r.id}>
            <div className="request-icon"><FileText/></div>
            <div>
              <strong>{r.type}</strong>
              <span>{r.dates}</span>
              <small>{r.reason}</small>
            </div>
            <StatusBadge status={r.status}/>
          </article>
        ))}
      </section>
    </div>
  );
}

function ProfileView({
  currentUser,
  onUpdateUser,
  isAppInstalled,
  canInstallApp,
  onInstallApp,
}: {
  currentUser: AuthUser;
  onUpdateUser: (user: AuthUser) => void;
  isAppInstalled?: boolean;
  canInstallApp?: boolean;
  onInstallApp?: () => void;
}) {
  const [formData, setFormData] = useState({
    name: currentUser.name || "",
    email: currentUser.email || "",
    nip: currentUser.nip === "—" ? "" : (currentUser.nip || ""),
    department: currentUser.department || "Subbidang Pengembangan dan Pengelolaan Sistem Aplikasi",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      name: currentUser.name || "",
      email: currentUser.email || "",
      nip: currentUser.nip === "—" ? "" : (currentUser.nip || ""),
      department: currentUser.department || prev.department,
    }));
  }, [currentUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    if (formData.newPassword) {
      if (formData.newPassword.length < 6) {
        setStatusMessage({ type: "error", text: "Password baru minimal 6 karakter." });
        return;
      }
      if (formData.newPassword !== formData.confirmPassword) {
        setStatusMessage({ type: "error", text: "Konfirmasi password baru tidak cocok." });
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const payload: any = {
        name: formData.name,
        email: formData.email,
        nip: formData.nip,
        department: formData.department,
      };

      if (formData.newPassword) {
        payload.new_password = formData.newPassword;
        if (formData.currentPassword) {
          payload.current_password = formData.currentPassword;
        }
      }

      const res = await authService.updateProfile(payload);

      if (res.success && res.data?.user) {
        onUpdateUser(res.data.user);
        setStatusMessage({ type: "success", text: res.message || "Profil Anda berhasil diperbarui." });
        setFormData((prev) => ({
          ...prev,
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        }));
      } else {
        const errorMsg = res.errors
          ? Object.values(res.errors).flat().join(" ")
          : res.message || "Gagal memperbarui profil.";
        setStatusMessage({ type: "error", text: errorMsg });
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Terjadi gangguan saat menyimpan profil." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const initials = (currentUser.name || "Pegawai")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const isAdmin = currentUser.isAdmin || currentUser.roles?.includes("admin");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Profile Hero Header Card */}
      <section
        style={{
          background: "linear-gradient(135deg, #0f766e 0%, #115e59 100%)",
          color: "#ffffff",
          borderRadius: 16,
          padding: "24px 28px",
          boxShadow: "0 10px 25px -5px rgba(15, 118, 110, 0.25)",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20, minWidth: 280 }}>
          <div
            style={{
              width: 70,
              height: 70,
              borderRadius: "50%",
              background: "#ffffff",
              color: "#0f766e",
              fontWeight: 800,
              fontSize: "1.6rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              border: "3px solid rgba(255,255,255,0.4)",
              flexShrink: 0,
            }}
          >
            {initials}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
              <h2 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 700, color: "#ffffff" }}>
                {currentUser.name}
              </h2>
              <span
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  padding: "3px 8px",
                  borderRadius: 6,
                  background: isAdmin ? "#fef08a" : "#ccfbf1",
                  color: isAdmin ? "#854d0e" : "#0f766e",
                }}
              >
                {isAdmin ? "Admin SDM" : "Pegawai Presensi"}
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", fontSize: "0.82rem", opacity: 0.9 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <Mail className="w-3.5 h-3.5" />
                {currentUser.email}
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <KeyRound className="w-3.5 h-3.5" />
                NIP: {currentUser.nip || "—"}
              </span>
            </div>

            <div style={{ marginTop: 8, fontSize: "0.8rem", display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.15)", padding: "3px 10px", borderRadius: 20 }}>
              <Building2 className="w-3.5 h-3.5" />
              <span>{currentUser.department}</span>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <div style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(4px)", padding: "10px 16px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.15)", minWidth: 120 }}>
            <div style={{ fontSize: "0.7rem", opacity: 0.8 }}>Satuan Kerja</div>
            <div style={{ fontWeight: 700, fontSize: "0.88rem" }}>Pusdatin Kemhan</div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(4px)", padding: "10px 16px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.15)", minWidth: 120 }}>
            <div style={{ fontSize: "0.7rem", opacity: 0.8 }}>Status Presensi</div>
            <div style={{ fontWeight: 700, fontSize: "0.88rem", display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#4ade80", display: "inline-block" }}></span>
              Akun Aktif
            </div>
          </div>
        </div>
      </section>

      {/* Status Alert Banner */}
      {statusMessage && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: 10,
            fontSize: "0.88rem",
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: statusMessage.type === "success" ? "#ecfdf5" : "#fff1f2",
            border: `1px solid ${statusMessage.type === "success" ? "#a7f3d0" : "#fecdd3"}`,
            color: statusMessage.type === "success" ? "#065f46" : "#9f1239",
          }}
        >
          {statusMessage.type === "success" ? <Check className="w-5 h-5 text-emerald-600" /> : <AlertTriangle className="w-5 h-5 text-rose-600" />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Profile Edit Form */}
      <form onSubmit={handleSubmit} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
        {/* Card 1: Data Identitas Diri & Kedinasan */}
        <div className="data-card" style={{ padding: "22px 24px" }}>
          <div className="section-head" style={{ marginBottom: 16 }}>
            <div>
              <span className="eyebrow">IDENTITAS DIRI</span>
              <h3 style={{ margin: 0, fontSize: "1.15rem", color: "#0f172a" }}>Data Personal & Kedinasan</h3>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#334155", marginBottom: 5 }}>
                Nama Lengkap *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  fontSize: "0.88rem",
                  outline: "none",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#334155", marginBottom: 5 }}>
                NIP (Nomor Induk Pegawai)
              </label>
              <input
                type="text"
                value={formData.nip}
                placeholder="Contoh: 199507122022031003"
                onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  fontSize: "0.88rem",
                  outline: "none",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#334155", marginBottom: 5 }}>
                Email Kedinasan *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  fontSize: "0.88rem",
                  outline: "none",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#334155", marginBottom: 5 }}>
                Unit Kerja / Divisi (Sesuai Bagan Pusdatin) *
              </label>
              <select
                required
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  fontSize: "0.85rem",
                  background: "#ffffff",
                  color: "#1e293b",
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                {formData.department &&
                  !PUSDATIN_ORG_STRUCTURE.some((org) => org.units.includes(formData.department)) && (
                    <option value={formData.department}>{formData.department}</option>
                  )}
                {PUSDATIN_ORG_STRUCTURE.map((org) => (
                  <optgroup key={org.group} label={`🏛️ ${org.group}`}>
                    {org.units.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <span style={{ fontSize: "0.72rem", color: "#64748b", marginTop: 4, display: "block" }}>
                Sesuai Struktur Organisasi Pusdatin Kemhan.
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Keamanan & Ganti Sandi */}
        <div className="data-card" style={{ padding: "22px 24px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div className="section-head" style={{ marginBottom: 16 }}>
              <div>
                <span className="eyebrow">KEAMANAN AKUN</span>
                <h3 style={{ margin: 0, fontSize: "1.15rem", color: "#0f172a" }}>Ubah Password</h3>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#334155", marginBottom: 5 }}>
                  Password Saat Ini
                </label>
                <input
                  type="password"
                  placeholder="Masukkan password lama"
                  value={formData.currentPassword}
                  onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                    fontSize: "0.88rem",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#334155", marginBottom: 5 }}>
                  Password Baru
                </label>
                <input
                  type="password"
                  placeholder="Minimal 6 karakter..."
                  value={formData.newPassword}
                  onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                    fontSize: "0.88rem",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#334155", marginBottom: 5 }}>
                  Konfirmasi Password Baru
                </label>
                <input
                  type="password"
                  placeholder="Ulangi password baru..."
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                    fontSize: "0.88rem",
                    outline: "none",
                  }}
                />
              </div>
            </div>
          </div>

          <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: "10px 24px",
                borderRadius: 10,
                border: "none",
                background: "#0f766e",
                color: "#ffffff",
                fontSize: "0.88rem",
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                boxShadow: "0 4px 12px rgba(15, 118, 110, 0.25)",
                opacity: isSubmitting ? 0.7 : 1,
              }}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin" style={{ width: 16, height: 16, border: "2px solid #ffffff", borderTopColor: "transparent", borderRadius: "50%" }}></div>
                  <span>Menyimpan Perubahan...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Simpan Perubahan Profil</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Card 3: Status PWA & Cache Instan */}
        <div className="data-card" style={{ padding: "22px 24px", gridColumn: "1 / -1" }}>
          <div className="section-head" style={{ marginBottom: 14 }}>
            <div>
              <span className="eyebrow">APLIKASI PWA &amp; CACHE CEPAT</span>
              <h3 style={{ margin: 0, fontSize: "1.15rem", color: "#0f172a" }}>Status Aplikasi SATRIA Kemhan</h3>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, alignItems: "center" }}>
            <div style={{ padding: "12px 14px", borderRadius: 10, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Mode Aplikasi</div>
              <div style={{ fontSize: "0.92rem", fontWeight: 700, color: "#0f172a", marginTop: 2, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: isAppInstalled ? "#10b981" : "#0284c7" }}></span>
                {isAppInstalled ? "Terpasang (PWA Standalone)" : "Browser Web (Dapat Di-install)"}
              </div>
            </div>

            <div style={{ padding: "12px 14px", borderRadius: 10, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Kecepatan &amp; Service Worker</div>
              <div style={{ fontSize: "0.92rem", fontWeight: 700, color: "#047857", marginTop: 2 }}>
                ✓ Cache Cepat Aktif (Loading 0 Detik)
              </div>
            </div>

            <div style={{ padding: "12px 14px", borderRadius: 10, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Kebijakan Transaksi Presensi</div>
              <div style={{ fontSize: "0.92rem", fontWeight: 700, color: "#881337", marginTop: 2 }}>
                🔒 Wajib Online (Intranet Pusdatin)
              </div>
            </div>
          </div>

          {canInstallApp && onInstallApp && (
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <div>
                <strong style={{ fontSize: "0.85rem", color: "#1e293b", display: "block" }}>Pasang SATRIA ke Layar Utama Perangkat</strong>
                <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Akses cepat tanpa browser bar seperti aplikasi native Kemhan.</span>
              </div>
              <button
                type="button"
                onClick={onInstallApp}
                style={{
                  padding: "8px 18px",
                  borderRadius: 8,
                  background: "linear-gradient(135deg, #881337 0%, #9f1239 100%)",
                  color: "#ffffff",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  boxShadow: "0 2px 8px rgba(136, 19, 55, 0.25)",
                }}
              >
                <Download className="w-4 h-4 text-rose-200" />
                <span>Install SATRIA Sekarang</span>
              </button>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}

function AdminView({
  initialTab = "audit",
  onTabChange,
  requests,
  auditLogs = [],
  adminMetrics,
  onApprovalAction,
  onSimulateBot,
  onRefreshData,
}: {
  initialTab?: "audit" | "approval" | "units" | "users";
  onTabChange?: (tab: "audit" | "approval" | "units" | "users") => void;
  requests: RequestItem[];
  auditLogs?: AuditLogItem[];
  adminMetrics?: any;
  onApprovalAction: (id: number, status: "Disetujui" | "Ditolak") => void;
  onSimulateBot?: () => Promise<void>;
  onRefreshData?: () => Promise<void>;
}) {
  const [activeTab, setActiveTab] = useState<"audit" | "approval" | "units" | "users">(initialTab || "audit");
  const [auditFilter, setAuditFilter] = useState<"all" | "anomaly" | "clean">("all");
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [inspectingItem, setInspectingItem] = useState<AuditLogItem | null>(null);

  // State Manajemen Pegawai
  const [usersList, setUsersList] = useState<UserItem[]>([]);
  const [userDepartments, setUserDepartments] = useState<string[]>(() =>
    PUSDATIN_ORG_STRUCTURE.flatMap((g) => g.units)
  );
  const [userSearch, setUserSearch] = useState("");
  const [userDeptFilter, setUserDeptFilter] = useState("all");
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [userFormData, setUserFormData] = useState({
    name: "",
    email: "",
    nip: "",
    department: "Subbidang Pengembangan dan Pengelolaan Sistem Aplikasi",
    role: "pegawai",
    password: "",
  });
  const [userFormError, setUserFormError] = useState("");
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [downloadingPdfUserId, setDownloadingPdfUserId] = useState<number | null>(null);

  const handleDownloadEmployeePdf = async (targetUser: UserItem) => {
    try {
      setDownloadingPdfUserId(targetUser.id);
      await attendanceService.downloadOfficialPdf(undefined, targetUser.id);
    } catch (err: any) {
      alert(err?.message || "Gagal mengunduh dokumen PDF.");
    } finally {
      setDownloadingPdfUserId(null);
    }
  };

  const loadUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const res = await userApiService.getUsers(userSearch, userDeptFilter, userRoleFilter);
      if (res.success && res.data) {
        setUsersList(res.data.users);
        if (res.data.departments && res.data.departments.length > 0) {
          setUserDepartments(res.data.departments);
        }
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (activeTab === "users") {
      loadUsers();
    }
  }, [activeTab, userSearch, userDeptFilter, userRoleFilter]);

  const handleOpenUserModal = (user?: UserItem) => {
    setUserFormError("");
    if (user) {
      setEditingUser(user);
      setUserFormData({
        name: user.name,
        email: user.email,
        nip: user.nip === "—" ? "" : (user.nip || ""),
        department: user.department || "Subbidang Pengembangan dan Pengelolaan Sistem Aplikasi",
        role: user.role || "pegawai",
        password: "",
      });
    } else {
      setEditingUser(null);
      setUserFormData({
        name: "",
        email: "",
        nip: "",
        department: "Subbidang Pengembangan dan Pengelolaan Sistem Aplikasi",
        role: "pegawai",
        password: "",
      });
    }
    setIsUserModalOpen(true);
  };

  const handleFormSubmitUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserFormError("");
    setIsSavingUser(true);
    try {
      if (editingUser) {
        await userApiService.updateUser(editingUser.id, userFormData);
      } else {
        if (!userFormData.password || userFormData.password.length < 6) {
          setUserFormError("Password wajib diisi minimal 6 karakter");
          setIsSavingUser(false);
          return;
        }
        await userApiService.createUser(userFormData);
      }
      setIsUserModalOpen(false);
      await loadUsers();
    } catch (err: any) {
      setUserFormError(err.message || "Gagal menyimpan data pegawai");
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleDeleteUserClick = async (user: UserItem) => {
    if (confirm(`Yakin ingin menghapus pegawai ${user.name}?`)) {
      try {
        await userApiService.deleteUser(user.id);
        await loadUsers();
      } catch (err: any) {
        alert(err.message || "Gagal menghapus pegawai");
      }
    }
  };

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const handleTabClick = (tab: "audit" | "approval" | "units" | "users") => {
    setActiveTab(tab);
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  const metrics = adminMetrics || {
    totalEmployees: 0,
    presentCount: 0,
    lateCount: 0,
    pendingCount: requests.filter((r) => r.status === "Menunggu").length,
    botAnomaliesCount: auditLogs.filter((l) => l.isMockLocation).length,
    units: [],
  };

  const attendanceRate =
    metrics.totalEmployees > 0 ? Math.round((metrics.presentCount / metrics.totalEmployees) * 100) : 0;

  const botAnomalyCount = auditLogs.filter((l) => l.isMockLocation).length;
  const cleanCount = auditLogs.filter((l) => !l.isMockLocation).length;

  const filteredAuditLogs = useMemo(() => {
    if (auditFilter === "anomaly") return auditLogs.filter((l) => l.isMockLocation);
    if (auditFilter === "clean") return auditLogs.filter((l) => !l.isMockLocation);
    return auditLogs;
  }, [auditLogs, auditFilter]);

  const handleRunBotSimulation = async () => {
    if (!onSimulateBot || isSimulating) return;
    setIsSimulating(true);
    try {
      await onSimulateBot();
      handleTabClick("audit");
      setAuditFilter("anomaly");
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="page-stack">
      {/* 5-Card Metric Overview */}
      <section className="admin-metrics" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
        <article>
          <Users />
          <span>Total pegawai</span>
          <strong>{metrics.totalEmployees}</strong>
          <small>{metrics.units?.length || 0} unit kerja</small>
        </article>
        <article>
          <Check />
          <span>Hadir hari ini</span>
          <strong>{metrics.presentCount}</strong>
          <small>{attendanceRate}% kehadiran</small>
        </article>
        <article>
          <Clock3 />
          <span>Terlambat</span>
          <strong>{metrics.lateCount}</strong>
          <small>perlu pemantauan</small>
        </article>
        <article>
          <FileText />
          <span>Menunggu approval</span>
          <strong>{requests.filter((r) => r.status === "Menunggu").length}</strong>
          <small>pengajuan izin</small>
        </article>
        <article
          style={{
            borderLeft: botAnomalyCount > 0 ? "4px solid #f43f5e" : "4px solid #10b981",
            background: botAnomalyCount > 0 ? "rgba(244, 63, 94, 0.05)" : undefined,
          }}
        >
          <ShieldAlert className={botAnomalyCount > 0 ? "text-rose-600" : "text-emerald-600"} />
          <span>Anomali Bot & Fraud</span>
          <strong className={botAnomalyCount > 0 ? "text-rose-600" : "text-emerald-600"}>
            {botAnomalyCount}
          </strong>
          <small>{botAnomalyCount > 0 ? "kasus terdeteksi" : "sistem terpantau aman"}</small>
        </article>
      </section>

      {/* Navigation Sub-Tabs */}
      <div style={{ display: "flex", gap: 8, borderBottom: "1px solid #e2e8f0", paddingTop: 8, paddingBottom: 10, marginTop: 4, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => handleTabClick("audit")}
          style={{
            padding: "8px 16px",
            borderRadius: 10,
            fontSize: "0.85rem",
            fontWeight: 600,
            cursor: "pointer",
            border: "none",
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: activeTab === "audit" ? "#0f766e" : "#f1f5f9",
            color: activeTab === "audit" ? "#ffffff" : "#475569",
            transition: "all 0.15s ease",
          }}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Audit Forensik</span>
          {botAnomalyCount > 0 && (
            <span
              style={{
                background: "#f43f5e",
                color: "#fff",
                fontSize: "0.72rem",
                padding: "2px 7px",
                borderRadius: 999,
                fontWeight: 700,
              }}
            >
              {botAnomalyCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => handleTabClick("approval")}
          style={{
            padding: "8px 16px",
            borderRadius: 10,
            fontSize: "0.85rem",
            fontWeight: 600,
            cursor: "pointer",
            border: "none",
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: activeTab === "approval" ? "#0f766e" : "#f1f5f9",
            color: activeTab === "approval" ? "#ffffff" : "#475569",
            transition: "all 0.15s ease",
          }}
        >
          <FileText className="w-4 h-4" />
          <span>Approval Pengajuan Izin/Cuti</span>
          {requests.filter((r) => r.status === "Menunggu").length > 0 && (
            <span
              style={{
                background: "#d97706",
                color: "#fff",
                fontSize: "0.72rem",
                padding: "2px 7px",
                borderRadius: 999,
                fontWeight: 700,
              }}
            >
              {requests.filter((r) => r.status === "Menunggu").length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => handleTabClick("units")}
          style={{
            padding: "8px 16px",
            borderRadius: 10,
            fontSize: "0.85rem",
            fontWeight: 600,
            cursor: "pointer",
            border: "none",
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: activeTab === "units" ? "#0f766e" : "#f1f5f9",
            color: activeTab === "units" ? "#ffffff" : "#475569",
            transition: "all 0.15s ease",
          }}
        >
          <Users className="w-4 h-4" />
          <span>Kehadiran per Unit</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabClick("users")}
          style={{
            padding: "8px 16px",
            borderRadius: 10,
            fontSize: "0.85rem",
            fontWeight: 600,
            cursor: "pointer",
            border: "none",
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: activeTab === "users" ? "#0f766e" : "#f1f5f9",
            color: activeTab === "users" ? "#ffffff" : "#475569",
            transition: "all 0.15s ease",
          }}
        >
          <UserCheck className="w-4 h-4" />
          <span>Data Pegawai</span>
        </button>
      </div>

      {/* TAB 1: AUDIT ANTI-FRAUD & BOT DETECTION */}
      {activeTab === "audit" && (
        <section className="data-card">
          <div className="section-head" style={{ marginBottom: 12 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span className="eyebrow" style={{ margin: 0 }}>SECURITY FORENSIC ENGINE</span>
                <span
                  style={{
                    background: "rgba(13, 148, 136, 0.12)",
                    color: "#0f766e",
                    padding: "2px 8px",
                    borderRadius: 6,
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    border: "1px solid rgba(13, 148, 136, 0.25)",
                  }}
                >
                  Multi-Vector Radar Aktif
                </span>
              </div>
              <h2 style={{ margin: 0 }}>Audit Keaslian Presensi</h2>
              <p style={{ margin: "4px 0 0 0", fontSize: "0.82rem", color: "#64748b" }}>
                Pemeriksaan keabsahan dan integritas data presensi pegawai secara real-time.
              </p>
            </div>
          </div>

          {/* Unified Action & Filter Toolbar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, margin: "8px 0 16px 0", flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <button
                type="button"
                onClick={() => setAuditFilter("all")}
                style={{
                  padding: "6px 13px",
                  borderRadius: 8,
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  border: "1px solid " + (auditFilter === "all" ? "#334155" : "#e2e8f0"),
                  background: auditFilter === "all" ? "#334155" : "#ffffff",
                  color: auditFilter === "all" ? "#ffffff" : "#475569",
                  transition: "all 0.15s ease",
                }}
              >
                Semua Log ({auditLogs.length})
              </button>
              <button
                type="button"
                onClick={() => setAuditFilter("anomaly")}
                style={{
                  padding: "6px 13px",
                  borderRadius: 8,
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  border: "1px solid " + (auditFilter === "anomaly" ? "#e11d48" : "#fecdd3"),
                  background: auditFilter === "anomaly" ? "#e11d48" : "#fff1f2",
                  color: auditFilter === "anomaly" ? "#ffffff" : "#be123c",
                  transition: "all 0.15s ease",
                }}
              >
                Anomali Bot ({botAnomalyCount})
              </button>
              <button
                type="button"
                onClick={() => setAuditFilter("clean")}
                style={{
                  padding: "6px 13px",
                  borderRadius: 8,
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  border: "1px solid " + (auditFilter === "clean" ? "#059669" : "#a7f3d0"),
                  background: auditFilter === "clean" ? "#059669" : "#ecfdf5",
                  color: auditFilter === "clean" ? "#ffffff" : "#047857",
                  transition: "all 0.15s ease",
                }}
              >
                Wajar / Asli ({cleanCount})
              </button>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await attendanceService.downloadOfficialPdf();
                  } catch (err: any) {
                    alert(err.message || "Gagal mengunduh laporan PDF resmi.");
                  }
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 13px",
                  borderRadius: 8,
                  background: "linear-gradient(135deg, #881337 0%, #9f1239 100%)",
                  color: "#ffffff",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  border: "1px solid #9f1239",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  boxShadow: "0 1px 3px rgba(136, 19, 55, 0.2)",
                }}
                title="Unduh Laporan Resmi Format PDF (Berlogo Pusdatin Kemhan)"
              >
                <FileText className="w-3.5 h-3.5 text-rose-200" />
                <span>Ekspor PDF Kemhan</span>
              </button>

              {onRefreshData && (
                <button
                  type="button"
                  onClick={onRefreshData}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 12px",
                    borderRadius: 8,
                    background: "#ffffff",
                    color: "#334155",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    border: "1px solid #cbd5e1",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                  title="Muat Ulang Log Audit"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                  <span>Refresh</span>
                </button>
              )}
            </div>
          </div>

          {filteredAuditLogs.length === 0 ? (
            <div className="empty-state-card" style={{ padding: "40px 20px", textAlign: "center" }}>
              <ShieldCheck className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
              <strong style={{ display: "block", color: "#334155", fontSize: "0.95rem" }}>
                Tidak Ada Anomali Ditemukan
              </strong>
              <p style={{ color: "#64748b", fontSize: "0.82rem", margin: "4px 0 0 0" }}>
                Semua presensi pegawai tercatat normal dan memenuhi kriteria keaslian manusiawi.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: "auto", width: "100%" }}>
              <Table style={{ tableLayout: "fixed", width: "100%", minWidth: 680 }}>
                <TableHeader>
                  <TableRow>
                    <TableHead style={{ width: "24%" }}>Pegawai &amp; Unit</TableHead>
                    <TableHead style={{ width: "18%" }}>Waktu &amp; Mode</TableHead>
                    <TableHead style={{ width: "20%" }}>Status Keaslian</TableHead>
                    <TableHead style={{ width: "18%" }}>Indikator</TableHead>
                    <TableHead style={{ width: "12%" }}>Jaringan</TableHead>
                    <TableHead style={{ width: "8%", textAlign: "right" }}>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAuditLogs.map((log) => {
                    const isFraud = Boolean(log.isMockLocation);
                    return (
                      <TableRow
                        key={log.id}
                        style={{
                          background: isFraud ? "rgba(244, 63, 94, 0.03)" : undefined,
                        }}
                      >
                        <TableCell style={{ overflow: "hidden" }}>
                          <strong style={{ display: "block", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                            {log.userName}
                          </strong>
                          <small style={{ display: "block", color: "#64748b", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                            {log.department || "Informatika"} • {log.userEmail}
                          </small>
                        </TableCell>

                        <TableCell>
                          <strong style={{ fontFamily: "monospace", fontSize: "0.85rem", display: "block" }}>
                            {log.inTimeExact} WIB
                          </strong>
                          <span
                            style={{
                              fontSize: "0.7rem",
                              fontWeight: 600,
                              padding: "2px 6px",
                              borderRadius: 4,
                              display: "inline-block",
                              marginTop: 2,
                              background: log.attendanceMode === "WFH" ? "rgba(59, 130, 246, 0.12)" : "rgba(16, 185, 129, 0.12)",
                              color: log.attendanceMode === "WFH" ? "#2563eb" : "#059669",
                            }}
                          >
                            {log.attendanceMode || "WFO"}
                          </span>
                        </TableCell>

                        <TableCell>
                          {isFraud ? (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 5,
                                padding: "3px 8px",
                                borderRadius: 6,
                                fontSize: "0.74rem",
                                fontWeight: 600,
                                background: "#ffe4e6",
                                color: "#be123c",
                                border: "1px solid #fecdd3",
                              }}
                            >
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                              <span>Anomali Terdeteksi</span>
                            </span>
                          ) : (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 5,
                                padding: "3px 8px",
                                borderRadius: 6,
                                fontSize: "0.74rem",
                                fontWeight: 600,
                                background: "#ecfdf5",
                                color: "#047857",
                                border: "1px solid #a7f3d0",
                              }}
                            >
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Terverifikasi Sah</span>
                            </span>
                          )}
                          <small style={{ display: "block", color: "#64748b", marginTop: 2, fontSize: "0.7rem" }}>
                            Skor Risiko: {Math.round((log.entropyScore || (isFraud ? 0.95 : 0.05)) * 100)}%
                          </small>
                        </TableCell>

                        <TableCell style={{ overflow: "hidden" }}>
                          {isFraud ? (
                            <div>
                              <span
                                style={{
                                  display: "inline-block",
                                  fontSize: "0.72rem",
                                  fontWeight: 600,
                                  color: "#be123c",
                                  background: "#fff1f2",
                                  padding: "2px 8px",
                                  borderRadius: 4,
                                  border: "1px solid #ffe4e6",
                                  marginBottom: 2,
                                }}
                              >
                                {log.fraudReason ? `${log.fraudReason.split("|").length} Indikator Terdeteksi` : "Anomali Terdeteksi"}
                              </span>
                              <span
                                style={{
                                  display: "block",
                                  fontSize: "0.72rem",
                                  color: "#9f1239",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                                title={log.fraudReason}
                              >
                                {log.fraudReason?.split("|")[0]?.trim() || "Terdeteksi skrip otomatisasi"}
                              </span>
                            </div>
                          ) : (
                            <span style={{ fontSize: "0.75rem", color: "#047857", fontWeight: 500 }}>
                              Normal (Manusiawi)
                            </span>
                          )}
                        </TableCell>

                        <TableCell style={{ overflow: "hidden" }}>
                          <div style={{ fontSize: "0.78rem", color: "#334155", fontWeight: 600 }}>
                            {log.ipAddress || "10.20.14.99"}
                          </div>
                          <small
                            style={{
                              display: "block",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              color: "#64748b",
                              fontSize: "0.7rem",
                            }}
                            title={log.userAgent || "Browser"}
                          >
                            {log.userAgent ? log.userAgent.split(" ")[0] : "Browser"}
                          </small>
                        </TableCell>

                        <TableCell style={{ textAlign: "right" }}>
                          <button
                            type="button"
                            onClick={() => setInspectingItem(log)}
                            style={{
                              padding: "4px 12px",
                              borderRadius: 6,
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              background: "#f1f5f9",
                              color: "#334155",
                              border: "1px solid #cbd5e1",
                              cursor: "pointer",
                              transition: "background 0.15s ease",
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "#e2e8f0")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "#f1f5f9")}
                          >
                            Detail
                          </button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </section>
      )}

      {/* TAB 2: APPROVAL PERMOHONAN IZIN/CUTI */}
      {activeTab === "approval" && (
        <section className="data-card">
          <div className="section-head">
            <div>
              <span className="eyebrow">VERIFIKASI &amp; APPROVAL</span>
              <h2>Daftar Permohonan Izin / Cuti</h2>
            </div>
            <Badge variant="outline">
              {requests.filter((r) => r.status === "Menunggu").length} Menunggu Tindakan
            </Badge>
          </div>

          {requests.length === 0 ? (
            <div className="empty-state-card">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">Belum ada pengajuan izin atau cuti yang masuk.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pegawai &amp; Unit</TableHead>
                  <TableHead>Jenis</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Alasan / Keterangan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Tindakan SDM</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell>
                      <strong>{(req as any).userName || "Pegawai"}</strong>
                      <small style={{ display: "block", color: "#64748b" }}>{(req as any).department || "Pusdatin Kemhan"}</small>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{req.type}</Badge>
                    </TableCell>
                    <TableCell>{req.dates}</TableCell>
                    <TableCell className="max-w-[220px] truncate" title={req.reason}>
                      {req.reason}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={req.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      {req.status === "Menunggu" ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => onApprovalAction(req.id, "Disetujui")}
                            className="px-2.5 py-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg border-0 cursor-pointer transition-all shadow-sm"
                            title="Setujui Pengajuan"
                          >
                            Setujui
                          </button>
                          <button
                            type="button"
                            onClick={() => onApprovalAction(req.id, "Ditolak")}
                            className="px-2.5 py-1 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg border-0 cursor-pointer transition-all shadow-sm"
                            title="Tolak Pengajuan"
                          >
                            Tolak
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs font-medium text-slate-400">Selesai Diverifikasi</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </section>
      )}

      {/* TAB 3: KEHADIRAN PER UNIT */}
      {activeTab === "units" && (() => {
        const unitsList = metrics.units || [];
        const totalEmployees = unitsList.reduce((acc: number, u: any) => acc + (u.total || 0), 0);
        const totalPresent = unitsList.reduce((acc: number, u: any) => acc + (u.present || 0), 0);
        const totalLate = unitsList.reduce((acc: number, u: any) => acc + (u.late || 0), 0);
        const totalOnTime = Math.max(0, totalPresent - totalLate);
        const totalAbsent = Math.max(0, totalEmployees - totalPresent);
        const avgRate = totalEmployees > 0 ? Math.round((totalPresent / totalEmployees) * 100) : 0;

        // Data untuk Grafik Batang (BarChart Recharts)
        const barChartData = unitsList.map((u: any) => {
          const onTime = Math.max(0, (u.present || 0) - (u.late || 0));
          const late = u.late || 0;
          const absent = Math.max(0, (u.total || 0) - (u.present || 0));
          const rate = u.total > 0 ? Math.round((u.present / u.total) * 100) : 0;
          return {
            name: u.name,
            shortName: u.name.length > 15 ? u.name.substring(0, 14) + "…" : u.name,
            "Tepat Waktu": onTime,
            "Terlambat": late,
            "Belum Hadir": absent,
            rate,
            total: u.total,
            present: u.present,
          };
        });

        // Data untuk Donut Chart (PieChart Recharts)
        const pieData = [
          { name: "Tepat Waktu", value: totalOnTime, color: "#0d9488" },
          { name: "Terlambat", value: totalLate, color: "#f59e0b" },
          { name: "Belum Hadir", value: totalAbsent, color: "#cbd5e1" },
        ].filter(d => d.value > 0);

        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Header & KPI Summary Card */}
            <section className="data-card" style={{ padding: "20px 24px" }}>
              <div className="section-head" style={{ marginBottom: 16 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span className="eyebrow" style={{ margin: 0 }}>MONITORING &amp; ANALITIK REAL-TIME</span>
                    <span
                      style={{
                        background: "rgba(13, 148, 136, 0.12)",
                        color: "#0f766e",
                        padding: "2px 8px",
                        borderRadius: 6,
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        border: "1px solid rgba(13, 148, 136, 0.25)",
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                      }}
                    >
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#0d9488", display: "inline-block" }}></span>
                      Live Sinkronisasi
                    </span>
                  </div>
                  <h2 style={{ margin: 0, fontSize: "1.3rem" }}>Kehadiran per Unit Kerja</h2>
                  <p style={{ margin: "4px 0 0 0", fontSize: "0.82rem", color: "#64748b" }}>
                    Analisis komparatif tingkat kepatuhan dan distribusi kehadiran pegawai di setiap divisi.
                  </p>
                </div>
              </div>

              {/* 4 Mini KPI Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
                <div style={{ background: "#f8fafc", borderRadius: 12, padding: "14px 16px", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 10, background: "#e0f2fe", color: "#0284c7", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Total Unit Kerja</div>
                    <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#0f172a" }}>{unitsList.length} <span style={{ fontSize: "0.8rem", fontWeight: 500, color: "#94a3b8" }}>Divisi</span></div>
                  </div>
                </div>

                <div style={{ background: "#f8fafc", borderRadius: 12, padding: "14px 16px", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 10, background: "#ecfdf5", color: "#059669", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Rata-rata Kehadiran</div>
                    <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#059669" }}>{avgRate}% <span style={{ fontSize: "0.75rem", fontWeight: 600, padding: "2px 6px", borderRadius: 4, background: avgRate >= 85 ? "#d1fae5" : "#fef3c7", color: avgRate >= 85 ? "#065f46" : "#92400e" }}>{avgRate >= 85 ? "Optimal" : "Perlu Evaluasi"}</span></div>
                  </div>
                </div>

                <div style={{ background: "#f8fafc", borderRadius: 12, padding: "14px 16px", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 10, background: "#ccfbf1", color: "#0f766e", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Hadir Tepat Waktu</div>
                    <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#0f766e" }}>{totalOnTime} <span style={{ fontSize: "0.8rem", fontWeight: 500, color: "#64748b" }}>/ {totalPresent} hadir</span></div>
                  </div>
                </div>

                <div style={{ background: "#f8fafc", borderRadius: 12, padding: "14px 16px", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 10, background: "#fffbeb", color: "#d97706", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Clock3 className="w-5 h-5" />
                  </div>
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Total Terlambat</div>
                    <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#d97706" }}>{totalLate} <span style={{ fontSize: "0.8rem", fontWeight: 500, color: "#94a3b8" }}>Pegawai</span></div>
                  </div>
                </div>
              </div>
            </section>

            {/* Visual Charts Grid (Bar Chart & Donut Chart) */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 20 }}>
              {/* Kolom 1: Stacked Bar Chart Komparasi Antar Unit */}
              <section className="data-card" style={{ padding: "20px 24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#0f172a" }}>Distribusi Kehadiran Antar Unit</h3>
                    <p style={{ margin: "2px 0 0 0", fontSize: "0.75rem", color: "#64748b" }}>Komparasi pegawai hadir tepat waktu, terlambat, dan belum hadir</p>
                  </div>
                </div>

                <div style={{ width: "100%", height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="shortName" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                      <RechartsTooltip
                        contentStyle={{ background: "#ffffff", borderRadius: 10, border: "1px solid #e2e8f0", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", fontSize: "0.8rem" }}
                        formatter={(value: any, name: any) => [value + " Orang", name]}
                        labelFormatter={(label, payload) => {
                          const item = payload && payload[0] ? (payload[0].payload as any) : null;
                          return item ? item.name : label;
                        }}
                      />
                      <RechartsLegend wrapperStyle={{ fontSize: "0.75rem", paddingTop: 10 }} />
                      <Bar dataKey="Tepat Waktu" stackId="a" fill="#0d9488" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="Terlambat" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="Belum Hadir" stackId="a" fill="#cbd5e1" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>

              {/* Kolom 2: Donut Chart Proporsi Kehadiran Total */}
              <section className="data-card" style={{ padding: "20px 24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#0f172a" }}>Proporsi Status Presensi Hari Ini</h3>
                    <p style={{ margin: "2px 0 0 0", fontSize: "0.75rem", color: "#64748b" }}>Akumulasi kehadiran dari total {totalEmployees} pegawai</p>
                  </div>
                </div>

                <div style={{ width: "100%", height: 210, position: "relative" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        contentStyle={{ background: "#ffffff", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: "0.8rem" }}
                        formatter={(val: any, name: any) => [val + " Pegawai (" + (totalEmployees > 0 ? Math.round((val / totalEmployees) * 100) : 0) + "%)", name]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center Stat */}
                  <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center", pointerEvents: "none" }}>
                    <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#0f766e" }}>{avgRate}%</div>
                    <div style={{ fontSize: "0.68rem", color: "#64748b", fontWeight: 600 }}>Kehadiran</div>
                  </div>
                </div>

                {/* Legend list with counts */}
                <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 10, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.75rem" }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#0d9488" }}></span>
                    <span style={{ color: "#475569" }}>Tepat Waktu: <strong>{totalOnTime}</strong></span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.75rem" }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#f59e0b" }}></span>
                    <span style={{ color: "#475569" }}>Terlambat: <strong>{totalLate}</strong></span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.75rem" }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#cbd5e1" }}></span>
                    <span style={{ color: "#475569" }}>Belum: <strong>{totalAbsent}</strong></span>
                  </div>
                </div>
              </section>
            </div>

            {/* Performance Cards per Unit */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
              {unitsList.map((u: any) => {
                const rate = u.total > 0 ? Math.round((u.present / u.total) * 100) : 0;
                const onTime = Math.max(0, (u.present || 0) - (u.late || 0));
                const absent = Math.max(0, (u.total || 0) - (u.present || 0));
                const badgeColor = rate >= 85 ? { bg: "#ecfdf5", text: "#047857", label: "Sangat Baik" } : rate >= 70 ? { bg: "#eff6ff", text: "#1d4ed8", label: "Baik" } : { bg: "#fff1f2", text: "#be123c", label: "Perlu Evaluasi" };
                return (
                  <div key={u.name} style={{ background: "#ffffff", borderRadius: 14, padding: "16px 18px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "#1e293b" }}>{u.name}</h4>
                        <span style={{ fontSize: "0.72rem", color: "#64748b" }}>Kapasitas {u.total} Pegawai</span>
                      </div>
                      <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "3px 8px", borderRadius: 6, background: badgeColor.bg, color: badgeColor.text }}>
                        {badgeColor.label}
                      </span>
                    </div>

                    {/* Progress Bar Multi-Segment */}
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                        <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Tingkat Kehadiran</span>
                        <span style={{ fontSize: "1.1rem", fontWeight: 800, color: "#0f766e" }}>{rate}%</span>
                      </div>
                      <div style={{ height: 8, borderRadius: 999, background: "#e2e8f0", overflow: "hidden", display: "flex" }}>
                        <div style={{ width: `${u.total > 0 ? (onTime / u.total) * 100 : 0}%`, background: "#0d9488" }} title={`Tepat Waktu: ${onTime}`}></div>
                        <div style={{ width: `${u.total > 0 ? (u.late / u.total) * 100 : 0}%`, background: "#f59e0b" }} title={`Terlambat: ${u.late}`}></div>
                      </div>
                    </div>

                    {/* Quick Stats Grid */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, textAlign: "center", paddingTop: 8, borderTop: "1px solid #f1f5f9" }}>
                      <div style={{ background: "#f8fafc", padding: "6px 4px", borderRadius: 8 }}>
                        <div style={{ fontSize: "0.68rem", color: "#64748b" }}>Tepat</div>
                        <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#0f766e" }}>{onTime}</div>
                      </div>
                      <div style={{ background: "#f8fafc", padding: "6px 4px", borderRadius: 8 }}>
                        <div style={{ fontSize: "0.68rem", color: "#64748b" }}>Telat</div>
                        <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#d97706" }}>{u.late}</div>
                      </div>
                      <div style={{ background: "#f8fafc", padding: "6px 4px", borderRadius: 8 }}>
                        <div style={{ fontSize: "0.68rem", color: "#64748b" }}>Belum</div>
                        <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#94a3b8" }}>{absent}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tabel Detail Rinci */}
            <section className="data-card" style={{ padding: "20px 24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#0f172a" }}>Tabel Rekapitulasi Data Unit</h3>
                  <p style={{ margin: "2px 0 0 0", fontSize: "0.75rem", color: "#64748b" }}>Rincian tabular komparatif presensi seluruh divisi</p>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Unit Kerja</TableHead>
                    <TableHead style={{ textAlign: "center" }}>Total Pegawai</TableHead>
                    <TableHead style={{ textAlign: "center" }}>Tepat Waktu</TableHead>
                    <TableHead style={{ textAlign: "center" }}>Terlambat</TableHead>
                    <TableHead style={{ textAlign: "center" }}>Belum Hadir / Izin</TableHead>
                    <TableHead style={{ textAlign: "right" }}>Tingkat Kehadiran</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unitsList.map((u: any) => {
                    const rate = u.total > 0 ? Math.round((u.present / u.total) * 100) : 0;
                    const onTime = Math.max(0, (u.present || 0) - (u.late || 0));
                    const absent = Math.max(0, (u.total || 0) - (u.present || 0));
                    return (
                      <TableRow key={u.name}>
                        <TableCell>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 28, height: 28, borderRadius: 6, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", color: "#475569" }}>
                              <Building2 className="w-3.5 h-3.5" />
                            </div>
                            <strong>{u.name}</strong>
                          </div>
                        </TableCell>
                        <TableCell style={{ textAlign: "center", fontWeight: 600 }}>{u.total}</TableCell>
                        <TableCell style={{ textAlign: "center", color: "#0f766e", fontWeight: 600 }}>{onTime}</TableCell>
                        <TableCell style={{ textAlign: "center", color: "#d97706", fontWeight: 600 }}>{u.late}</TableCell>
                        <TableCell style={{ textAlign: "center", color: "#94a3b8", fontWeight: 600 }}>{absent}</TableCell>
                        <TableCell style={{ textAlign: "right" }}>
                          <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                            <div className="rate" style={{ width: 70, height: 6 }}>
                              <span style={{ width: `${rate}%` }}></span>
                            </div>
                            <strong style={{ fontSize: "0.85rem", color: "#0f766e" }}>{rate}%</strong>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </section>
          </div>
        );
      })()}

      {/* TAB 4: DATA PEGAWAI */}
      {activeTab === "users" && (
        <section className="data-card" style={{ padding: "20px 24px" }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 18, flexWrap: "wrap", width: "100%" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span className="eyebrow" style={{ margin: 0 }}>SDM &amp; KEPEGAWAIAN PUSDATIN</span>
                <span
                  style={{
                    background: "rgba(13, 148, 136, 0.12)",
                    color: "#0f766e",
                    padding: "2px 8px",
                    borderRadius: 6,
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    border: "1px solid rgba(13, 148, 136, 0.25)",
                  }}
                >
                  {usersList.length} Pegawai Terdaftar
                </span>
              </div>
              <h2 style={{ margin: 0, fontSize: "1.3rem" }}>Manajemen Data Pegawai</h2>
              <p style={{ margin: "4px 0 0 0", fontSize: "0.82rem", color: "#64748b" }}>
                Kelola data akun pegawai, penempatan unit kerja divisi, dan hak akses sistem absensi.
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleOpenUserModal()}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "#0f766e",
                color: "#ffffff",
                border: "none",
                borderRadius: 10,
                padding: "8px 16px",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 2px 6px rgba(15, 118, 110, 0.2)",
                transition: "all 0.15s ease",
                flexShrink: 0,
              }}
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Pegawai</span>
            </button>
          </div>

          {/* Search & Filter Bar */}
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
            <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
              <Search className="w-4 h-4" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
              <input
                type="text"
                placeholder="Cari nama, NIP, atau email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px 8px 36px",
                  borderRadius: 10,
                  border: "1px solid #cbd5e1",
                  fontSize: "0.85rem",
                  outline: "none",
                }}
              />
            </div>

            <select
              value={userDeptFilter}
              onChange={(e) => setUserDeptFilter(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: 10,
                border: "1px solid #cbd5e1",
                fontSize: "0.85rem",
                background: "#fff",
                color: "#334155",
                fontWeight: 500,
                outline: "none",
                cursor: "pointer",
                maxWidth: 280,
              }}
            >
              <option value="all">Semua Unit Kerja (Semua Divisi)</option>
              {PUSDATIN_ORG_STRUCTURE.map((org) => (
                <optgroup key={org.group} label={`🏛️ ${org.group}`}>
                  {org.units.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>

            <select
              value={userRoleFilter}
              onChange={(e) => setUserRoleFilter(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: 10,
                border: "1px solid #cbd5e1",
                fontSize: "0.85rem",
                background: "#fff",
                color: "#334155",
                fontWeight: 500,
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="all">Semua Role</option>
              <option value="pegawai">Pegawai Presensi</option>
              <option value="admin">Admin SDM</option>
            </select>

            <button
              type="button"
              onClick={loadUsers}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 12px",
                borderRadius: 10,
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                color: "#475569",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
              title="Segarkan data pegawai"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingUsers ? "animate-spin" : ""}`} />
            </button>
          </div>

          {/* Table */}
          {isLoadingUsers ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#64748b" }}>
              <div className="animate-spin" style={{ display: "inline-block", width: 24, height: 24, border: "2px solid #0f766e", borderTopColor: "transparent", borderRadius: "50%", marginBottom: 8 }}></div>
              <div>Memuat data pegawai...</div>
            </div>
          ) : usersList.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px", background: "#f8fafc", borderRadius: 12, border: "1px dashed #cbd5e1" }}>
              <UserCheck className="w-8 h-8" style={{ color: "#94a3b8", margin: "0 auto 8px" }} />
              <div style={{ fontWeight: 600, color: "#334155" }}>Tidak ada pegawai ditemukan</div>
              <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: 4 }}>Coba ubah kata kunci pencarian atau tambah pegawai baru.</div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pegawai</TableHead>
                  <TableHead>NIP</TableHead>
                  <TableHead>Unit Kerja</TableHead>
                  <TableHead>Hak Akses (Role)</TableHead>
                  <TableHead>Terdaftar</TableHead>
                  <TableHead style={{ textAlign: "center" }}>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersList.map((u) => {
                  const isAdminRole = (u.roles && u.roles.includes("admin")) || u.role === "admin";
                  const initials = u.name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
                  return (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: "50%",
                              background: isAdminRole ? "#e0f2fe" : "#e6f4f1",
                              color: isAdminRole ? "#0369a1" : "#0d9488",
                              fontWeight: 700,
                              fontSize: "0.78rem",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            {initials}
                          </div>
                          <div>
                            <strong style={{ fontSize: "0.88rem", color: "#0f172a", display: "block" }}>{u.name}</strong>
                            <span style={{ fontSize: "0.75rem", color: "#64748b" }}>{u.email}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell style={{ fontSize: "0.82rem", color: "#475569", fontWeight: 500 }}>
                        {u.nip || "—"}
                      </TableCell>
                      <TableCell>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            padding: "3px 8px",
                            borderRadius: 6,
                            background: "#f1f5f9",
                            color: "#334155",
                            maxWidth: 260,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={u.department}
                        >
                          <Building2 className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.department}</span>
                        </span>
                      </TableCell>
                      <TableCell style={{ whiteSpace: "nowrap" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            padding: "3px 8px",
                            borderRadius: 6,
                            background: isAdminRole ? "#dbeafe" : "#d1fae5",
                            color: isAdminRole ? "#1e40af" : "#065f46",
                          }}
                        >
                          {isAdminRole ? <ShieldCheck className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                          {isAdminRole ? "Admin SDM" : "Pegawai"}
                        </span>
                      </TableCell>
                      <TableCell style={{ fontSize: "0.78rem", color: "#64748b", whiteSpace: "nowrap" }}>
                        {u.created_at || "—"}
                      </TableCell>
                      <TableCell style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                        <div style={{ display: "inline-flex", gap: 6 }}>
                          <button
                            type="button"
                            onClick={() => handleDownloadEmployeePdf(u)}
                            disabled={downloadingPdfUserId === u.id}
                            style={{
                              padding: "5px 10px",
                              borderRadius: 6,
                              border: "1px solid #99f6e4",
                              background: "#f0fdfa",
                              color: "#0f766e",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              cursor: downloadingPdfUserId === u.id ? "wait" : "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                              transition: "all 0.15s ease",
                            }}
                            title={`Unduh Laporan PDF Resmi Presensi Pegawai: ${u.name}`}
                          >
                            {downloadingPdfUserId === u.id ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin text-teal-600" />
                                <span>Unduh...</span>
                              </>
                            ) : (
                              <>
                                <FileText className="w-3.5 h-3.5 text-teal-600" />
                                <span>Cetak PDF</span>
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenUserModal(u)}
                            style={{
                              padding: "5px 10px",
                              borderRadius: 6,
                              border: "1px solid #cbd5e1",
                              background: "#fff",
                              color: "#334155",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                            title="Edit Data Pegawai"
                          >
                            <Pencil className="w-3.5 h-3.5 text-slate-600" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteUserClick(u)}
                            style={{
                              padding: "5px 8px",
                              borderRadius: 6,
                              border: "1px solid #fecdd3",
                              background: "#fff1f2",
                              color: "#e11d48",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                            }}
                            title="Hapus Pegawai"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          {/* Modal Form Tambah / Edit Pegawai */}
          {isUserModalOpen && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(15, 23, 42, 0.65)",
                backdropFilter: "blur(4px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 9999,
                padding: 16,
              }}
              onClick={() => setIsUserModalOpen(false)}
            >
              <div
                style={{
                  background: "#ffffff",
                  borderRadius: 16,
                  maxWidth: 480,
                  width: "100%",
                  padding: 24,
                  boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
                  border: "1px solid #e2e8f0",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: "#ccfbf1", color: "#0f766e", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <UserCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#0f172a" }}>
                        {editingUser ? "Edit Data Pegawai" : "Tambah Pegawai Baru"}
                      </h3>
                      <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                        {editingUser ? `Perbarui profil ${editingUser.name}` : "Daftarkan pegawai ke sistem absensi SATRIA"}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsUserModalOpen(false)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {userFormError && (
                  <div style={{ background: "#fff1f2", border: "1px solid #fecdd3", color: "#be123c", padding: "8px 12px", borderRadius: 8, fontSize: "0.8rem", marginBottom: 14 }}>
                    {userFormError}
                  </div>
                )}

                <form onSubmit={handleFormSubmitUser}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#334155", marginBottom: 4 }}>Nama Lengkap *</label>
                      <input
                        type="text"
                        required
                        placeholder="Contoh: Budi Santoso"
                        value={userFormData.name}
                        onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                        style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.85rem", outline: "none" }}
                      />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <div>
                        <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#334155", marginBottom: 4 }}>NIP (Nomor Induk)</label>
                        <input
                          type="text"
                          placeholder="19950712..."
                          value={userFormData.nip}
                          onChange={(e) => setUserFormData({ ...userFormData, nip: e.target.value })}
                          style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.85rem", outline: "none" }}
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#334155", marginBottom: 4 }}>Email Kedinasan *</label>
                        <input
                          type="email"
                          required
                          placeholder="nama@satria.id"
                          value={userFormData.email}
                          onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                          style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.85rem", outline: "none" }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#334155", marginBottom: 4 }}>
                        Unit Kerja / Divisi (Sesuai Bagan Organisasi) *
                      </label>
                      <select
                        required
                        value={userFormData.department}
                        onChange={(e) => setUserFormData({ ...userFormData, department: e.target.value })}
                        style={{
                          width: "100%",
                          padding: "9px 12px",
                          borderRadius: 8,
                          border: "1px solid #cbd5e1",
                          fontSize: "0.85rem",
                          background: "#fff",
                          color: "#1e293b",
                          outline: "none",
                          cursor: "pointer",
                        }}
                      >
                        <option value="" disabled>-- Pilih Unit Kerja Sesuai Bagan --</option>
                        {userFormData.department &&
                          !PUSDATIN_ORG_STRUCTURE.some((org) => org.units.includes(userFormData.department)) && (
                            <option value={userFormData.department}>{userFormData.department}</option>
                          )}
                        {PUSDATIN_ORG_STRUCTURE.map((org) => (
                          <optgroup key={org.group} label={`🏛️ ${org.group}`}>
                            {org.units.map((u) => (
                              <option key={u} value={u}>
                                {u}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#334155", marginBottom: 4 }}>Hak Akses (Role) *</label>
                      <select
                        value={userFormData.role}
                        onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value })}
                        style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.85rem", background: "#fff", outline: "none" }}
                      >
                        <option value="pegawai">Pegawai Presensi (Hanya Presensi & Izin)</option>
                        <option value="admin">Admin SDM (Akses Dashboard, Audit & Approval)</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#334155", marginBottom: 4 }}>
                        {editingUser ? "Ganti Password (Kosongkan jika tidak diubah)" : "Password Awal *"}
                      </label>
                      <input
                        type="password"
                        required={!editingUser}
                        placeholder={editingUser ? "Minimal 6 karakter baru..." : "Minimal 6 karakter..."}
                        value={userFormData.password}
                        onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                        style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.85rem", outline: "none" }}
                      />
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
                    <button
                      type="button"
                      onClick={() => setIsUserModalOpen(false)}
                      style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", color: "#475569", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer" }}
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingUser}
                      style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: "#0f766e", color: "#fff", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", opacity: isSavingUser ? 0.7 : 1 }}
                    >
                      {isSavingUser ? "Menyimpan..." : editingUser ? "Perbarui Data" : "Simpan Pegawai"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </section>
      )}

      {/* FORENSIC TELEMETRY INSPECTION MODAL */}
      {inspectingItem && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 16,
          }}
          onClick={() => setInspectingItem(null)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 16,
              maxWidth: 520,
              width: "100%",
              padding: 24,
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
              border: inspectingItem.isMockLocation ? "2px solid #f43f5e" : "2px solid #059669",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {inspectingItem.isMockLocation ? (
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                ) : (
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                )}
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700 }}>
                    {inspectingItem.isMockLocation ? "Laporan Bukti Anomali" : "Hasil Audit Keaslian"}
                  </h3>
                  <span style={{ fontSize: "0.75rem", color: "#64748b" }}>ID Log Presensi #{inspectingItem.id}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectingItem(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: "0.82rem" }}>
              <div style={{ background: "#f8fafc", padding: "10px 12px", borderRadius: 8 }}>
                <span style={{ color: "#64748b", display: "block", fontSize: "0.72rem" }}>Pegawai:</span>
                <strong>{inspectingItem.userName}</strong> ({inspectingItem.userEmail})
              </div>

              <div style={{ background: "#f8fafc", padding: "10px 12px", borderRadius: 8 }}>
                <span style={{ color: "#64748b", display: "block", fontSize: "0.72rem" }}>Timestamp Presisi Detik:</span>
                <strong style={{ fontFamily: "monospace", color: "#0f766e" }}>{inspectingItem.inTimeExact} WIB</strong> ({inspectingItem.date})
              </div>

              <div style={{ background: inspectingItem.isMockLocation ? "#ffe4e6" : "#ecfdf5", padding: "12px 14px", borderRadius: 8 }}>
                <span style={{ color: inspectingItem.isMockLocation ? "#9f1239" : "#065f46", display: "block", fontSize: "0.75rem", fontWeight: 700, marginBottom: 6 }}>
                  Indikator yang Terdeteksi:
                </span>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {inspectingItem.fraudReason?.split("|").map((item, idx) => (
                    <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: "0.8rem", color: inspectingItem.isMockLocation ? "#9f1239" : "#065f46" }}>
                      <span style={{ fontWeight: 700 }}>•</span>
                      <span>{item.trim()}</span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 8, paddingTop: 6, borderTop: inspectingItem.isMockLocation ? "1px solid #fecdd3" : "1px solid #a7f3d0", fontSize: "0.72rem", color: inspectingItem.isMockLocation ? "#9f1239" : "#065f46" }}>
                  Skor Risiko Anomali: {Math.round((inspectingItem.entropyScore || 0.05) * 100)}%
                </div>
              </div>

              <div style={{ background: "#f8fafc", padding: "10px 12px", borderRadius: 8 }}>
                <span style={{ color: "#64748b", display: "block", fontSize: "0.72rem" }}>IP &amp; Jaringan:</span>
                <code>{inspectingItem.ipAddress || "10.20.14.99"}</code>
              </div>

              <div style={{ background: "#f8fafc", padding: "10px 12px", borderRadius: 8 }}>
                <span style={{ color: "#64748b", display: "block", fontSize: "0.72rem" }}>User Agent Telemetri:</span>
                <code style={{ fontSize: "0.72rem", wordBreak: "break-all" }}>
                  {inspectingItem.userAgent || "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
                </code>
              </div>
            </div>

            <div style={{ marginTop: 20, textAlign: "right" }}>
              <Button onClick={() => setInspectingItem(null)} style={{ padding: "8px 20px" }}>
                Tutup Laporan
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Komponen Layar QR Monitor Khusus TV/Lobby Kantor Pusdatin Kemhan.
 * Menghasilkan token QR dinamis per 30 detik untuk mencegah kecurangan scan foto statis.
 */
function MonitorQrView({ currentDateTime }: { currentDateTime: Date }) {
  const [qrData, setQrData] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState<number>(30);

  const fetchQrToken = async () => {
    try {
      const res = await attendanceService.getDynamicQrMonitor();
      if (res.success && res.data) {
        setQrData(res.data);
        setTimeLeft(res.data.secondsRemaining || 30);
      }
    } catch {
      // Fallback generator lokal
      const now = new Date();
      const slot = Math.floor(now.getTime() / 30000);
      const rem = 30 - (Math.floor(now.getTime() / 1000) % 30);
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      setQrData({
        token: `SATRIA-PUSDATIN-${code}-${slot}`,
        displayCode: code,
        slot,
        secondsRemaining: rem,
        stepSeconds: 30,
        officeName: "Pusdatin Kemhan Pondok Labu",
      });
      setTimeLeft(rem);
    }
  };

  useEffect(() => {
    fetchQrToken();
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          fetchQrToken();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const timeString = currentDateTime.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div className="monitor-container">
      <div className="monitor-header">
        <div className="monitor-badge">
          <span className="live-dot"></span>
          <span>MONITOR DISPLAY LOBBY PUSDATIN KEMHAN</span>
        </div>
        <div className="monitor-clock">
          <Clock3 className="w-5 h-5 text-teal-400" />
          <span>{timeString} WIB</span>
        </div>
      </div>

      <div className="monitor-card">
        <div className="monitor-left">
          <div className="monitor-brand">
            <ShieldCheck className="w-8 h-8 text-teal-400" />
            <div>
              <h2>SATRIA SMART ATTENDANCE</h2>
              <p>Pusdatin Kemhan • Pondok Labu, Jakarta Selatan</p>
            </div>
          </div>

          <div className="schedule-pills">
            <div className="schedule-pill">
              <span className="pill-label">Jam Masuk</span>
              <strong>06:50 WIB</strong>
              <small>Toleransi s.d 07:05</small>
            </div>
            <div className="schedule-pill">
              <span className="pill-label">Jam Pulang</span>
              <strong>15:30 WIB</strong>
              <small>Senin – Jumat</small>
            </div>
          </div>

          <div className="token-info-box">
            <span className="token-label">KODE TOKEN DINAMIS (TOTP):</span>
            <strong className="token-val" style={{ fontSize: "1.8rem", letterSpacing: "3px", color: "#38bdf8", fontFamily: "monospace" }}>
              {qrData?.formattedCode || qrData?.numericCode || qrData?.displayCode || "PUSDATIN"}
            </strong>
            <p className="token-desc">
              Kode angka 6-digit berganti otomatis tiap 15 detik. Masukkan kode ini pada menu Presensi di HP Anda jika tidak memindai QR code.
            </p>
          </div>
        </div>

        <div className="monitor-right">
          <div style={{
            background: "linear-gradient(145deg, rgba(13, 148, 136, 0.18) 0%, rgba(15, 23, 42, 0.6) 100%)",
            border: "2px solid rgba(45, 212, 191, 0.4)",
            borderRadius: 24,
            padding: "36px 24px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            boxShadow: "0 20px 40px rgba(0, 0, 0, 0.3)",
          }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 800, letterSpacing: "0.15em", color: "#5eead4", textTransform: "uppercase", marginBottom: 12 }}>
              KODE TOKEN PRESENSI (TOTP)
            </span>

            <div style={{
              fontSize: "3.6rem",
              fontWeight: 900,
              letterSpacing: "6px",
              color: "#ffffff",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              textShadow: "0 0 25px rgba(45, 212, 191, 0.75)",
              margin: "10px 0",
              lineHeight: 1.1,
            }}>
              {qrData?.formattedCode || qrData?.numericCode || "178-869"}
            </div>

            <p style={{ color: "#94a3b8", fontSize: "0.85rem", maxWidth: 320, margin: "8px 0 20px 0" }}>
              Ketik 6 digit angka di atas pada tombol Presensi di perangkat Anda
            </p>

            {/* Countdown Bar */}
            <div className="countdown-container" style={{ width: "100%", maxWidth: 320 }}>
              <div className="countdown-track" style={{ height: 8, borderRadius: 999, background: "rgba(255,255,255,0.1)", overflow: "hidden" }}>
                <div 
                  className="countdown-fill" 
                  style={{ width: `${(timeLeft / (qrData?.stepSeconds || 15)) * 100}%`, height: "100%", background: "linear-gradient(90deg, #10b981, #2dd4bf)", transition: "width 1s linear" }}
                ></div>
              </div>
              <div className="countdown-text" style={{ marginTop: 8, display: "flex", justifyContent: "center", fontSize: "0.78rem", color: "#cbd5e1" }}>
                <span>Kode berganti: <strong>{timeLeft} detik</strong></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
