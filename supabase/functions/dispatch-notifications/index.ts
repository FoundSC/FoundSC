// Supabase Edge Function: dispatch-notifications
// Sends pending notifications via Expo Push API, falls back to marking as skipped
// Note: configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the Edge function env

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function sendExpoPush(messages: Array<{ to: string; title: string; body: string }>) {
  if (messages.length === 0) return { ok: true };
  const res = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(messages),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data } as const;
}

serve(async (req) => {
  try {
    // Fetch a batch of pending notifications
    const { data: pending, error } = await supabase
      .from("notifications")
      .select("id, post_id, lost_post_id, user_id, device_token, message")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(100);

    if (error) throw error;
    if (!pending || pending.length === 0) {
      return new Response(JSON.stringify({ ok: true, processed: 0 }), { headers: { "content-type": "application/json" } });
    }

    // Resolve target tokens per row: prefer row.device_token; else fetch by user_id; else skip
    const messages: { to: string; title: string; body: string; _id: number }[] = [];

    for (const row of pending) {
      let tokens: string[] = [];
      if (row.device_token) {
        tokens = [row.device_token];
      } else if (row.user_id) {
        const { data: devs, error: devErr } = await supabase
          .from("device_push_tokens")
          .select("token")
          .eq("user_id", row.user_id);
        if (devErr) console.warn("device tokens lookup failed", devErr.message);
        tokens = (devs || []).map((d: any) => d.token);
      }

      if (tokens.length === 0) {
        // no tokens, mark as skipped
        await supabase
          .from("notifications")
          .update({ status: "skipped", error: "no device tokens" })
          .eq("id", row.id);
        continue;
      }

      for (const t of tokens) {
        messages.push({ to: t, title: "FoundSC", body: row.message || "New match found", _id: row.id });
      }
    }

    // Grouped send
    const payload = messages.map(({ to, title, body }) => ({ to, title, body }));
    const { ok, data } = await sendExpoPush(payload);
    console.log("expo push response", JSON.stringify(data || {}, null, 2));

    if (!ok) {
      console.error("expo push error", data);
      const ids = [...new Set(messages.map((m) => m._id))];
      await supabase
        .from("notifications")
        .update({ status: "failed", error: JSON.stringify(data).slice(0, 2000) })
        .in("id", ids);
      return new Response(JSON.stringify({ ok: false, error: "expo push failed" }), { status: 500 });
    }

    // Inspect per-message receipts from Expo; mark successes and failures separately
    const receipts: Array<{ status?: string; message?: string; details?: any }> =
      (data && (data as any).data && Array.isArray((data as any).data)) ? (data as any).data : [];

    let sentIds: number[] = [];
    let failed: { id: number; err: any; to?: string }[] = [];

    if (receipts.length === messages.length) {
      receipts.forEach((r, idx) => {
        const msg = messages[idx];
        if (!msg) return;
        if (r && r.status === "ok") {
          sentIds.push(msg._id);
        } else {
          failed.push({ id: msg._id, err: r, to: msg.to });
        }
      });
    } else {
      // Fallback: if counts don't match, assume success and mark all as sent
      sentIds = [...new Set(messages.map((m) => m._id))];
    }

    // Mark failures
    if (failed.length > 0) {
      const ids = failed.map((f) => f.id);
      await supabase
        .from("notifications")
        .update({ status: "failed", error: (failed[0]?.err ? JSON.stringify(failed[0].err) : "unknown").slice(0, 2000) })
        .in("id", ids);

      // Optional: clean up invalid tokens
      for (const f of failed) {
        const code = (f.err?.details && (f.err.details.error || f.err.details.__debug?.errorCode)) || f.err?.message;
        if (String(code).toLowerCase().includes("devicenotregistered") && f.to) {
          await supabase.from("device_push_tokens").delete().eq("token", f.to);
        }
      }
    }

    // Mark sent successes
    if (sentIds.length > 0) {
      await supabase
        .from("notifications")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .in("id", sentIds);
    }

    return new Response(JSON.stringify({ ok: true, processed: sentIds.length, failed: failed.length }), {
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    console.error("dispatch failure", e?.message || e);
    return new Response(JSON.stringify({ ok: false, error: e?.message || String(e) }), { status: 500 });
  }
});
