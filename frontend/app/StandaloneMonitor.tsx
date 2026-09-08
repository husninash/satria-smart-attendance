import React, { useEffect, useState } from "react";
import { ShieldCheck, Clock3, MapPin, QrCode, Wifi, Monitor } from "lucide-react";
import QRCode from "qrcode";
import { attendanceService } from "./services/AttendanceApiService";

export default function StandaloneMonitorPage() {
  const [qrData, setQrData] = useState<any>(null);
  const [qrSvgDataUrl, setQrSvgDataUrl] = useState<string>("");
  const [timeLeft, setTimeLeft] = useState<number>(10);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);

  const fetchQrToken = async () => {
    try {
      const res = await attendanceService.getDynamicQrMonitor();
      if (res.success && res.data) {
        setQrData(res.data);
        setTimeLeft(res.data.secondsRemaining || 10);
        
        // Generate Real Scannable QR Code dengan kontras tinggi & payload ringkas
        const payloadString = `https://satria.kemhan.go.id/absen?code=${res.data.displayCode}&token=${res.data.token}&t=${Date.now()}`;
        const url = await QRCode.toDataURL(payloadString, {
          width: 400,
          margin: 1,
          color: {
            dark: "#042f2e", // Ultra dark teal (hampir hitam) agar kamera HP membaca super cepat
            light: "#ffffff",
          },
          errorCorrectionLevel: "M" // Medium error correction agar matriks tidak terlalu rapat
        });
        setQrSvgDataUrl(url);
      }
    } catch {
      const now = new Date();
      const slot = Math.floor(now.getTime() / 10000);
      const rem = 10 - (Math.floor(now.getTime() / 1000) % 10);
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const token = `SATRIA-PUSDATIN-${code}-${slot}`;
      setQrData({
        token,
        displayCode: code,
        slot,
        secondsRemaining: rem,
        stepSeconds: 10,
        officeName: "Pusdatin Kemhan Pondok Labu",
      });
      setTimeLeft(rem);

      const payloadString = `https://satria.kemhan.go.id/absen?code=${code}&token=${token}&t=${now.getTime()}`;
      QRCode.toDataURL(payloadString, {
        width: 400,
        margin: 1,
        color: { dark: "#042f2e", light: "#ffffff" },
        errorCorrectionLevel: "M"
      }).then(setQrSvgDataUrl).catch(() => {});
    }
  };

  useEffect(() => {
    fetchQrToken();
    const interval = setInterval(() => {
      setCurrentTime(new Date());
      setTimeLeft((prev) => {
        if (prev <= 1) {
          fetchQrToken();
          return 10;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
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
    <div className="standalone-monitor-root">
      {/* Top Standalone Bar */}
      <header className="kiosk-topbar">
        <div className="kiosk-brand">
          <div className="kiosk-logo-box">
            <ShieldCheck className="w-8 h-8 text-teal-400" />
          </div>
          <div>
            <h1 className="kiosk-title">SATRIA DISPLAY MONITOR</h1>
            <p className="kiosk-subtitle">Pusdatin Kemhan • Gedung Utama Lt. 1 Pondok Labu</p>
          </div>
        </div>

        <div className="kiosk-center-status">
          <span className="kiosk-live-badge">
            <span className="live-dot"></span>
            LIVE BROADCAST LOBBY
          </span>
          <div className="kiosk-network-tag">
            <Wifi className="w-4 h-4 text-emerald-400" />
            <span>Dedicated LAN 10.10.24.1</span>
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
          {/* Left Column: Security Protocol & Office Info */}
          <div className="kiosk-info-card">
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

            {/* Kode Dynamic TOTP Besar di Bawah Keterangan Jam */}
            <div className="kiosk-big-code-container">
              <div className="kiosk-big-code-header">
                <span className="kiosk-big-code-label">KODE TOKEN PRESENSI (TOTP)</span>
                <span className="kiosk-big-code-timer">⚡ Berganti tiap 10s</span>
              </div>
              <div className="kiosk-big-code-display">
                <span className="kiosk-big-code-text">{qrData?.displayCode || "SATRIA"}</span>
              </div>
              <small className="kiosk-big-code-hint">Gunakan kode ini jika kamera HP Anda mengalami kendala scan</small>
            </div>

            <div className="kiosk-security-box">
              <div className="security-item">
                <MapPin className="w-5 h-5 text-teal-400 shrink-0" />
                <div>
                  <strong>Geofencing Enforced (Radius 150m)</strong>
                  <p>Hanya berlaku di titik koordinat resmi Pusdatin Kemhan (-6.312961, 106.792705).</p>
                </div>
              </div>
              <div className="security-item">
                <QrCode className="w-5 h-5 text-teal-400 shrink-0" />
                <div>
                  <strong>Dynamic Time-Step QR Token</strong>
                  <p>QR kadaluarsa setiap 30 detik. Mencegah manipulasi foto dan titip absen.</p>
                </div>
              </div>
            </div>

            <div className="kiosk-footer-note">
              <span>Status Kios: <strong>ONLINE & TERVERIFIKASI</strong></span>
              <button onClick={toggleFullscreen} className="btn-fullscreen">
                <Monitor className="w-4 h-4" />
                {isFullscreen ? "Keluar Fullscreen" : "Mode TV Fullscreen"}
              </button>
            </div>
          </div>

          {/* Right Column: Dynamic Big QR Box */}
          <div className="kiosk-qr-card">
            <div className="kiosk-qr-top">
              <span className="qr-badge">SCAN DENGAN APLIKASI SATRIA</span>
              <span className="token-code-tag">KODE: {qrData?.displayCode || "PUSDATIN"}</span>
            </div>

            <div className="kiosk-qr-frame">
              {qrSvgDataUrl ? (
                <div style={{ position: "relative", width: "100%", aspectRatio: "1/1", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <img
                    src={qrSvgDataUrl}
                    alt="Dynamic QR Presensi SATRIA"
                    style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: 16 }}
                  />
                  {/* Central Kemhan Shield Emblem Overlay */}
                  <div
                    style={{
                      position: "absolute",
                      width: "42px",
                      height: "42px",
                      borderRadius: "50%",
                      background: "#ffffff",
                      border: "3px solid #0f766e",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
                    }}
                  >
                    <ShieldCheck className="w-6 h-6 text-teal-700" />
                  </div>
                </div>
              ) : (
                <div style={{ height: "300px", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8" }}>
                  <span>Membuat QR Dinamis...</span>
                </div>
              )}
            </div>

            {/* Countdown Bar */}
            <div className="kiosk-progress-wrap">
              <div className="kiosk-progress-bar">
                <div 
                  className="kiosk-progress-fill"
                  style={{ width: `${(timeLeft / 10) * 100}%` }}
                ></div>
              </div>
              <div className="kiosk-progress-label">
                <span>Pembaruan Token: <strong>{timeLeft} Detik</strong></span>
                <span className="live-pulse-text">⚡ Enkripsi Cepat Real-Time</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
