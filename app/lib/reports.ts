import { supabase } from './supabase';

export type ReportStatus = 'open' | 'reviewed' | 'dismissed';

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

export type CreateReportInput = {
  reportedUserId: string;
  reporterUserId?: string | null; // can be omitted/undefined for anonymous
  postId?: number | null;
  reason: string;
  message?: string;
};

// Create a new report row, this uses the public insert policy on `reports`
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
