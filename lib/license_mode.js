"use strict";

/** Default free-mode cap. Licensed mode has no bulk cap. Single checks are never capped. */
const DEFAULT_FREE_BULK_DAILY_LIMIT = 25;

function utcDay(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

function freeBulkDailyLimit(env = process.env) {
  const raw = env.FREE_BULK_DAILY_LIMIT;
  if (raw == null || String(raw).trim() === "") return DEFAULT_FREE_BULK_DAILY_LIMIT;
  const n = Number.parseInt(String(raw), 10);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_FREE_BULK_DAILY_LIMIT;
  return n;
}

function bulkAllowance({ mode, used = 0, day, today, limit } = {}) {
  const todayKey = today || utcDay();
  if (mode === "licensed") {
    return { mode: "licensed", limit: null, used: 0, remaining: null, day: todayKey };
  }
  const cap = limit == null ? DEFAULT_FREE_BULK_DAILY_LIMIT : limit;
  const usedToday = day === todayKey ? Math.max(0, Number(used) || 0) : 0;
  return {
    mode: "free",
    limit: cap,
    used: usedToday,
    remaining: Math.max(0, cap - usedToday),
    day: todayKey,
  };
}

function claimBulk({ mode, used = 0, day, today, limit, requested = 0 } = {}) {
  const allowance = bulkAllowance({ mode, used, day, today, limit });
  const count = Math.max(0, Number(requested) || 0);
  if (allowance.mode === "licensed") {
    return { ...allowance, accepted: count, rejected: 0, nextUsed: 0, nextDay: allowance.day };
  }
  const accepted = Math.min(count, allowance.remaining);
  const rejected = count - accepted;
  return {
    ...allowance,
    accepted,
    rejected,
    nextUsed: allowance.used + accepted,
    nextDay: allowance.day,
  };
}

function licensePublicView(access, env = process.env) {
  const mode = access && access.mode === "licensed" ? "licensed" : "free";
  const limit = mode === "licensed" ? null : freeBulkDailyLimit(env);
  const message =
    mode === "licensed"
      ? "Licensed mode: no daily bulk cap. Single-address checks are not capped either."
      : `Free mode: ${limit} bulk addresses per account per UTC day. Single-address checks are not capped. A valid indus-license JSON file removes the bulk cap.`;
  return {
    mode,
    bulkDailyLimit: limit,
    singleCheckCapped: false,
    message,
  };
}

module.exports = {
  DEFAULT_FREE_BULK_DAILY_LIMIT,
  utcDay,
  freeBulkDailyLimit,
  bulkAllowance,
  claimBulk,
  licensePublicView,
};
