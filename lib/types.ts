export type ApiErrorBody = {
  reason_code: string;
  message: string;
  details?: Record<string, unknown>;
};

export type TokenPair = {
  access_token: string;
  token_type: string;
  expires_in: number;
  role: string;
  user_id: string;
  employee_id: string | null;
  full_name: string;
  refresh_token?: string | null;
};

export type Location = {
  id: string;
  name: string;
  slug: string;
  lat: number;
  lng: number;
  radius_m: number;
  notes: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type Employee = {
  id: string;
  user_id: string;
  employee_code: string;
  full_name: string;
  email: string;
  phone: string | null;
  job_title: string | null;
  department_id: string | null;
  is_active: boolean;
  notes: string | null;
  location_ids: string[];
  primary_location_id: string | null;
  current_shift_id: string | null;
  created_at: string;
  updated_at: string;
};

export type EnrollmentCode = {
  id: string;
  code: string;
  status: string;
  expires_at: string;
  created_at: string;
};

export type Device = {
  id: string;
  employee_id: string;
  device_model: string | null;
  os_version: string | null;
  app_version: string | null;
  status: string;
  registered_at: string;
  approved_at: string | null;
  last_seen_at: string | null;
};

export type Shift = {
  id: string;
  name: string;
  code: string | null;
  start_time: string;
  end_time: string;
  grace_late_minutes: number;
  grace_early_minutes: number;
  cross_midnight: boolean;
  active: boolean;
  created_at: string;
};

export type SitePresence = {
  location_id: string;
  name: string;
  slug: string;
  present: number;
};

export type CheckInAlert = {
  employee_id: string;
  full_name: string;
  employee_code: string;
  kind: "late" | "missed" | string;
  shift_name: string;
  scheduled_start: string;
  check_in_at: string | null;
  minutes_over: number;
  message: string;
};

export type Dashboard = {
  work_date: string;
  timezone: string;
  total_employees: number;
  present: number;
  absent: number;
  late: number;
  early_departure: number;
  currently_checked_in: number;
  on_leave: number;
  rejected_attempts: number;
  pending_review: number;
  suspicious_events: number;
  geofence_exits_today: number;
  check_in_alerts_count: number;
  devices_needing_attention: number;
  by_site: SitePresence[];
  check_in_alerts: CheckInAlert[];
};

export type QrDisplayLink = {
  site_slug: string;
  exp: number;
  sig: string;
  path: string;
  display_url: string;
};

export type QrToken = {
  site_slug: string;
  location_id: string;
  token: string;
  window: number;
  window_seconds: number;
  expires_in: number;
  server_time: string;
};
