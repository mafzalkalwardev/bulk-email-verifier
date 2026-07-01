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

async function verifyLicense(root, licensePath) {
  if (skipCheck()) return { ok: true };
  const file = licensePath || findLicenseFile(root);
  if (!file) {
    throw new Error(
      "No INDUS license file found. Download from https://indus-web-agency.vercel.app/dashboard"
    );
  }
  const record = JSON.parse(fs.readFileSync(file, "utf8"));
  record.licenseToken = record.licenseToken || record.license_token;
  record.expiresAt = record.expiresAt || record.expires_at;
  record.verifyUrl = record.verifyUrl || record.verify_url || DEFAULT_VERIFY_URL;
  record.productSlug = record.productSlug || record.product_slug;
  if (!record.licenseToken) throw new Error("License file missing licenseToken");
  if (isExpired(record.expiresAt)) {
    throw new Error("Subscription expired — renew at indus-web-agency.vercel.app");
  }
  try {
    const online = await verifyOnline(record);
    if (online.ok) {
      fs.writeFileSync(
        cachePath(root),
        JSON.stringify({ verifiedAt: new Date().toISOString(), expiresAt: online.expiresAt, licensePath: file }, null, 2)
      );
      return online;
    }
    throw new Error(online.message || "License verification failed");
  } catch (err) {
    if (err.message && !err.message.includes("fetch")) throw err;
    try {
      const cache = JSON.parse(fs.readFileSync(cachePath(root), "utf8"));
      if (cache.licensePath === file && cache.expiresAt && !isExpired(cache.expiresAt)) {
        const ageH = (Date.now() - Date.parse(cache.verifiedAt)) / 3600000;
        if (ageH <= OFFLINE_GRACE_HOURS) return { ok: true, offline: true, expiresAt: cache.expiresAt };
      }
    } catch {
      /* no cache */
    }
    throw new Error(err.message || "Could not verify license online");
  }
}

async function requireIndusLicense(root) {
  await verifyLicense(root);
}

module.exports = { requireIndusLicense, verifyLicense, findLicenseFile };
