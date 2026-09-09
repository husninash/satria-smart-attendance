import React, { useEffect, useState } from "react";
import { ShieldCheck, Clock3, MapPin, Wifi, Monitor, KeyRound, Smartphone, CheckCircle2 } from "lucide-react";
import { attendanceService } from "./services/AttendanceApiService";

export default function StandaloneMonitorPage() {
  const [qrData, setQrData] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState<number>(15);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);

  const fetchQrToken = async () => {
    try {
      const res = await attendanceService.getDynamicQrMonitor();
      if (res.success && res.data) {
        setQrData(res.data);
        setTimeLeft(res.data.secondsRemaining || 15);
      }
    } catch {
      const now = new Date();
      const slot = Math.floor(now.getTime() / 15000);
      const rem = 15 - (Math.floor(now.getTime() / 1000) % 15);
      const numCode = String(Math.floor(100000 + Math.random() * 900000));
      const formatted = `${numCode.slice(0, 3)}-${numCode.slice(3, 6)}`;
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const token = `SATRIA-PUSDATIN-${code}-${slot}`;
      setQrData({
        token,
        displayCode: code,
        numericCode: numCode,
        formattedCode: formatted,
        slot,
        secondsRemaining: rem,
        stepSeconds: 15,
        officeName: "Pusdatin Kemhan Pondok Labu",
      });
      setTimeLeft(rem);
    }
  };

  useEffect(() => {
    fetchQrToken();
    const interval = setInterval(() => {
      setCurrentTime(new Date());
      setTimeLeft((prev) => {
        if (prev <= 1) {
          fetchQrToken();
          return 15;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const timeString = currentTime.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const dateString = currentTime.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div
      className="standalone-monitor-root kiosk-container"
      style={{
        minHeight: "100vh",
        width: "100%",
        background: "radial-gradient(circle at 50% 10%, #0d3b37 0%, #061e1b 100%)",
        color: "#f8fafc",
        boxSizing: "border-box",
      }}
    >
      {/* Kiosk Military Aesthetic Ambient Header */}
      <header className="kiosk-topbar">
        <div className="kiosk-brand">
          <div className="kiosk-logo-box">
            <ShieldCheck className="w-8 h-8 text-teal-300" />
          </div>
          <div>
            <h1 className="kiosk-title">SATRIA DISPLAY MONITOR</h1>
            <p className="kiosk-subtitle">Pusdatin Kemhan • Gedung Utama Lt. 1 Pondok Labu</p>
          </div>
        </div>

        <div className="kiosk-center-status">
          <span className="kiosk-live-badge">
            <span className="live-pulse"></span>
            LIVE MONITORING KIOSK
          </span>
          <div className="kiosk-network-tag">
            <Wifi className="w-3.5 h-3.5 text-teal-400" />
            <span>Subnet Intranet Kemhan</span>
          </div>
        </div>

        <div className="kiosk-time-box">
          <div className="kiosk-digital-clock">
            <Clock3 className="w-6 h-6 text-teal-400" />
            <span>{timeString} WIB</span>
          </div>
          <span className="kiosk-date-text">{dateString}</span>
        </div>
      </header>

      {/* Main Kiosk Content */}
      <main className="kiosk-body">
        <div className="kiosk-grid">
          {/* Left Column: Security Protocol & Instructions */}
          <div className="kiosk-info-card" style={{ background: "rgba(15, 23, 42, 0.65)", border: "1px solid rgba(255, 255, 255, 0.1)" }}>
            <div>
              <div className="kiosk-card-header">
                <span className="eyebrow-mil">PROTOKOL KEAMANAN PRESENSI</span>
                <h2>Pusat Data & Informasi (Pusdatin)</h2>
                <p className="kiosk-lead">Kementerian Pertahanan Republik Indonesia</p>
              </div>

              <div className="kiosk-schedules">
                <div className="kiosk-schedule-item">
                  <span className="sched-tag">Jam Masuk Operasional</span>
                  <strong>06:50 WIB</strong>
                  <small>Batas Toleransi: 07:05 WIB</small>
                </div>
                <div className="kiosk-schedule-item">
                  <span className="sched-tag">Jam Kepulangan Dinas</span>
                  <strong>15:30 WIB</strong>
                  <small>Senin s.d Jumat</small>
                </div>
              </div>

              {/* Petunjuk Penggunaan bagi Pegawai */}
              <div style={{
                background: "rgba(0, 0, 0, 0.3)",
                border: "1px solid rgba(45, 212, 191, 0.2)",
                borderRadius: 14,
                padding: "12px 14px",
                marginBottom: 10,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <ShieldCheck className="w-4 h-4 text-teal-400" />
                  <span style={{ fontSize: "0.74rem", fontWeight: 800, color: "#2dd4bf", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                    PANDUAN PRESENSI WFO
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: "0.8rem", color: "#cbd5e1" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(13, 148, 136, 0.25)", color: "#2dd4bf", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.75rem", flexShrink: 0 }}>
                      1
                    </div>
                    <span>Buka aplikasi SATRIA di HP / Laptop Anda saat tiba di kantor.</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(13, 148, 136, 0.25)", color: "#2dd4bf", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.75rem", flexShrink: 0 }}>
                      2
                    </div>
                    <span>Klik tombol <strong>Presensi Masuk</strong> atau <strong>Presensi Pulang</strong>.</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(13, 148, 136, 0.25)", color: "#2dd4bf", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.75rem", flexShrink: 0 }}>
                      3
                    </div>
                    <span>Ketik <strong>6 digit kode angka</strong> yang tampil di layar sebelah kanan.</span>
                  </div>
                </div>
              </div>

            </div>

            <div className="kiosk-footer-note" style={{ marginTop: 14 }}>
              <span>Status Kios: <strong>ONLINE & TERVERIFIKASI</strong></span>
              <button onClick={toggleFullscreen} className="btn-fullscreen">
                <Monitor className="w-4 h-4" />
                {isFullscreen ? "Keluar Fullscreen" : "Mode TV Fullscreen"}
              </button>
            </div>
          </div>

          {/* Right Column: Hero Dynamic TOTP Display Card */}
          <div className="kiosk-qr-card" style={{ background: "rgba(15, 23, 42, 0.65)", border: "1px solid rgba(255, 255, 255, 0.1)", justifyContent: "center", padding: "24px" }}>
            <div className="kiosk-qr-top" style={{ maxWidth: 440, marginBottom: 14 }}>
              <span className="qr-badge" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#2dd4bf" }}>
                <KeyRound className="w-4 h-4" /> TOKEN OTENTIKASI LOBI PUSDATIN
              </span>
              <span className="token-code-tag">AKTIF</span>
            </div>

            {/* Huge Glowing Digit Box */}
            <div style={{
              width: "100%",
              maxWidth: 440,
              background: "linear-gradient(145deg, rgba(13, 148, 136, 0.25) 0%, rgba(15, 23, 42, 0.85) 100%)",
              border: "2px solid rgba(45, 212, 191, 0.5)",
              borderRadius: 20,
              padding: "32px 16px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.6), inset 0 0 35px rgba(45, 212, 191, 0.15)",
              textAlign: "center",
            }}>
              <span style={{
                fontSize: "0.8rem",
                fontWeight: 800,
                letterSpacing: "0.15em",
                color: "#5eead4",
                textTransform: "uppercase",
                marginBottom: 12,
              }}>
                KODE DINAMIS PRESENSI (TOTP)
              </span>

              <div style={{
                fontSize: "4.4rem",
                fontWeight: 900,
                letterSpacing: "6px",
                color: "#ffffff",
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                textShadow: "0 0 30px rgba(45, 212, 191, 0.85), 0 0 70px rgba(45, 212, 191, 0.4)",
                lineHeight: 1,
                margin: "8px 0",
              }}>
                {qrData?.formattedCode || qrData?.numericCode || "178-869"}
              </div>

              <div style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "rgba(45, 212, 191, 0.12)",
                border: "1px solid rgba(45, 212, 191, 0.3)",
                padding: "4px 14px",
                borderRadius: 999,
                fontSize: "0.78rem",
                color: "#a7f3d0",
                marginTop: 12,
                fontWeight: 600,
              }}>
                <Smartphone className="w-3.5 h-3.5" />
                <span>Bisa diketik tanpa tanda strip (-) • Contoh: <strong>{qrData?.numericCode || "974201"}</strong></span>
              </div>
            </div>

            {/* Countdown Bar */}
            <div className="kiosk-progress-wrap" style={{ maxWidth: 440, marginTop: 16 }}>
              <div className="kiosk-progress-bar">
                <div 
                  className="kiosk-progress-fill"
                  style={{ width: `${(timeLeft / (qrData?.stepSeconds || 15)) * 100}%` }}
                ></div>
              </div>
              <div className="kiosk-progress-label" style={{ marginTop: 8, display: "flex", justifyContent: "center" }}>
                <span>Kode Berganti Dalam: <strong>{timeLeft} Detik</strong></span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
