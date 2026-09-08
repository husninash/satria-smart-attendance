export interface AttendanceItem {
  id?: number;
  date: string;
  day: string;
  inTime: string;
  outTime: string;
  inTimeExact?: string;
  outTimeExact?: string;
  status: string;
  attendanceMode?: "WFO" | "WFH" | "Dinas Luar" | string;
  distance: string;
  rawDate?: string;
  isMockLocation?: boolean;
  fraudReason?: string;
  entropyScore?: number;
  ipAddress?: string;
  userAgent?: string;
  gpsAccuracy?: number;
}

export interface AuditLogItem {
  id: number;
  userName: string;
  userEmail: string;
  department: string;
  date: string;
  inTimeExact: string;
  outTimeExact?: string;
  status: string;
  attendanceMode: string;
  isMockLocation: boolean;
  fraudReason: string;
  entropyScore: number;
  ipAddress: string;
  userAgent: string;
  gpsAccuracy?: number;
}

export interface RequestItem {
  id: number;
  type: string;
  dates: string;
  reason: string;
  status: string;
  attachment?: string | null;
}

export interface DashboardSummaryResponse {
  user: {
    id: number;
    name: string;
    email: string;
    department: string;
  };
  today: {
    inTime: string;
    outTime: string;
    inTimeExact?: string;
    outTimeExact?: string;
    status: string;
    distance: string;
    attendanceMode?: string;
    isMockLocation?: boolean;
    fraudReason?: string;
    entropyScore?: number;
  } | null;
  attendance: AttendanceItem[];
  auditLogs?: AuditLogItem[];
  requests: RequestItem[];
  adminMetrics?: any;
}
