import { supabase } from './supabase';

// High-level status of a report, used by admins to track review progress.
// - 'open':   The report has been created and is waiting for an admin to review.
// - 'reviewed': An admin has looked at the report and taken (or logged) some action.
// - 'dismissed': The report was considered invalid or no action was needed.
export type ReportStatus = 'open' | 'reviewed' | 'dismissed';

// Shape of a single row in the `reports` table as returned from Supabase.
// This mirrors the database columns one-to-one so that the frontend has
// strong typing when reading or updating reports.
//
// Note: this type does NOT enforce any permissions or RLS; it is purely
// a TypeScript description of the data shape.
export type Report = {
  id: number;
  reported_user_id: string;
  reporter_user_id: string | null;
  post_id: number | null;
  reason: string;
  message: string | null;
  status: ReportStatus;
  created_at: string;
};

// Input shape used when a client creates a new report from the app UI.
// This is intentionally separate from `Report` so the caller only has to
// provide fields that make sense at creation time (e.g. no `id`, `status`,
// or `created_at`, since those are assigned by the database).
export type CreateReportInput = {
  reportedUserId: string;
  reporterUserId?: string | null; // can be omitted/undefined for anonymous
  postId?: number | null;
  reason: string;
  message?: string;
};

// Create a new report row in the `reports` table via Supabase.
//
// Responsibilities of this helper:
// - Validate the input coming from the UI (e.g. ensure `reason` is not empty).
// - Normalize/trim user-provided strings so the database stores clean values.
// - Map friendly camelCase property names from the UI (`reportedUserId`)
//   to the snake_case column names used in the database (`reported_user_id`).
// - Perform the actual `insert` call against Supabase and return the newly
//   created row so callers can react to it if needed.
//
// This function assumes that:
// - The `reports` table already exists in the database.
// - RLS and insert policies on `reports` allow the current user/session to
//   insert a row with the given values.
//
// If validation fails or Supabase returns an error, this function throws,
// allowing the caller (e.g. a screen component) to show an error message.
export async function createReport(input: CreateReportInput): Promise<Report> {
  const trimmedReason = input.reason.trim();
  const trimmedMessage = (input.message ?? '').trim();

  if (!trimmedReason) {
    throw new Error('Reason is required');
  }

  const payload: {
    reported_user_id: string;
    reporter_user_id?: string | null;
    post_id?: number | null;
    reason: string;
    message?: string;
  } = {
    reported_user_id: input.reportedUserId,
    reason: trimmedReason,
  };

  if (typeof input.reporterUserId !== 'undefined') {
    payload.reporter_user_id = input.reporterUserId;
  }
  if (typeof input.postId !== 'undefined') {
    payload.post_id = input.postId ?? null;
  }
  if (trimmedMessage) {
    payload.message = trimmedMessage;
  }

  const { data, error } = await supabase
    .from('reports')
    .insert([payload])
    .select()
    .single();

  if (error || !data) {
    console.error('[reports] createReport error', error);
    throw error || new Error('Failed to create report');
  }

  return data as Report;
}

// Admin-only: list all reports. Requires a service-role client or an RLS policy that allows broader SELECT
export async function listAllReports(): Promise<Report[]> {
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[reports] listAllReports error', error);
    throw error;
  }

  return (data as Report[]) || [];
}
