"use strict";

const fs = require("fs");
const path = require("path");

const DEFAULT_VERIFY_URL = "https://indus-web-agency.vercel.app/api/license/verify";
const LICENSE_PREFIX = "indus-license";
const OFFLINE_GRACE_HOURS = 48;

function skipCheck() {
  return ["1", "true", "yes", "on"].includes(String(process.env.INDUS_SKIP_LICENSE || "").toLowerCase());
}

function searchDirs(root) {
  const dirs = [root];
  const data = path.join(root, "data");
  if (fs.existsSync(data)) dirs.push(data);
  return dirs;
}

function findLicenseFile(root) {
  for (const dir of searchDirs(root)) {
    let names = [];
    try {
      names = fs.readdirSync(dir);
    } catch {
      continue;
    }
    for (const name of names.sort()) {
      const lower = name.toLowerCase();
      if (lower.startsWith(LICENSE_PREFIX) && lower.endsWith(".json")) {
        return path.join(dir, name);
      }
    }
  }
  return null;
}

function parseIso(value) {
  if (!value) return null;
  const t = Date.parse(value);
  return Number.isNaN(t) ? null : t;
}

function isExpired(expiresAt) {
  const t = parseIso(expiresAt);
  return t === null || t <= Date.now();
}

function cachePath(root) {
  const dir = path.join(root, "data");
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, "indus_license_cache.json");
}

function readRecord(file) {
  const record = JSON.parse(fs.readFileSync(file, "utf8"));
  record.licenseToken = record.licenseToken || record.license_token;
  record.expiresAt = record.expiresAt || record.expires_at;
  record.verifyUrl = record.verifyUrl || record.verify_url || DEFAULT_VERIFY_URL;
  record.productSlug = record.productSlug || record.product_slug;
  return record;
}

async function verifyOnline(record) {
  const res = await fetch(record.verifyUrl || DEFAULT_VERIFY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ licenseToken: record.licenseToken }),
  });
  const data = await res.json().catch(() => ({}));
  if (data.valid) {
    return {
      ok: true,
      expiresAt: data.expiresAt || record.expiresAt,
      productSlug: data.productSlug || record.productSlug,
    };
  }
  return { ok: false, reason: data.reason || "invalid", message: data.error || "License invalid" };
}

function offlineGrace(root, file) {
  try {
    const cache = JSON.parse(fs.readFileSync(cachePath(root), "utf8"));
    if (cache.licensePath === file && cache.expiresAt && !isExpired(cache.expiresAt)) {
      const ageH = (Date.now() - Date.parse(cache.verifiedAt)) / 3600000;
      if (ageH <= OFFLINE_GRACE_HOURS) {
        return { ok: true, offline: true, expiresAt: cache.expiresAt };
      }
    }
  } catch {
    /* no cache */
  }
  return null;
}

/**
 * Decide free vs licensed.
 * No license file, an expired file, or a file that cannot be verified → free mode.
 * A verified file (or a still-valid 48h offline cache) → licensed mode.
 * INDUS_SKIP_LICENSE=1 forces licensed mode for local development.
 */
async function resolveAccess(root, licensePath) {
  if (skipCheck()) {
    return { ok: true, mode: "licensed", reason: "INDUS_SKIP_LICENSE" };
  }

  const file = licensePath || findLicenseFile(root);
  if (!file) {
    return { ok: true, mode: "free", reason: "no-license-file" };
  }

  let record;
  try {
    record = readRecord(file);
  } catch (err) {
    return {
      ok: true,
      mode: "free",
      reason: "license-unreadable",
      message: err.message,
      licensePath: file,
    };
  }

  if (!record.licenseToken) {
    return {
      ok: true,
      mode: "free",
      reason: "license-missing-token",
      message: "License file missing licenseToken",
      licensePath: file,
    };
  }

  if (isExpired(record.expiresAt)) {
    return {
      ok: true,
      mode: "free",
      reason: "license-expired",
      message: "Subscription expired — renew at indus-web-agency.vercel.app",
      licensePath: file,
    };
  }

  try {
    const online = await verifyOnline(record);
    if (!online.ok) {
      return {
        ok: true,
        mode: "free",
        reason: "license-rejected",
        message: online.message || "License verification failed",
        licensePath: file,
      };
    }
    fs.writeFileSync(
      cachePath(root),
      JSON.stringify(
        { verifiedAt: new Date().toISOString(), expiresAt: online.expiresAt, licensePath: file },
        null,
        2
      )
    );
    return {
      ok: true,
      mode: "licensed",
      reason: "verified",
      expiresAt: online.expiresAt,
      licensePath: file,
    };
  } catch (err) {
    const cached = offlineGrace(root, file);
    if (cached) {
      return {
        ok: true,
        mode: "licensed",
        reason: "offline-grace",
        expiresAt: cached.expiresAt,
        licensePath: file,
      };
    }
    return {
      ok: true,
      mode: "free",
      reason: "license-unreachable",
      message: err.message || "Could not verify license online",
      licensePath: file,
    };
  }
}

async function verifyLicense(root, licensePath) {
  const access = await resolveAccess(root, licensePath);
  if (access.mode !== "licensed") {
    throw new Error(access.message || "No valid INDUS license file found.");
  }
  return access;
}

async function requireIndusLicense(root) {
  await verifyLicense(root);
}

module.exports = { requireIndusLicense, verifyLicense, findLicenseFile, resolveAccess };
