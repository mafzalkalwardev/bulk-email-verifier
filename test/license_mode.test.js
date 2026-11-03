"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  claimBulk,
  freeBulkDailyLimit,
  licensePublicView,
  DEFAULT_FREE_BULK_DAILY_LIMIT,
} = require("../lib/license_mode");
const { resolveAccess } = require("../lib/indus_license");

test("free mode accepts addresses only up to the daily cap", () => {
  const first = claimBulk({
    mode: "free",
    used: 0,
    day: "2026-11-03",
    today: "2026-11-03",
    limit: 25,
    requested: 10,
  });
  assert.equal(first.accepted, 10);
  assert.equal(first.rejected, 0);
  assert.equal(first.nextUsed, 10);

  const second = claimBulk({
    mode: "free",
    used: first.nextUsed,
    day: first.nextDay,
    today: "2026-11-03",
    limit: 25,
    requested: 20,
  });
  assert.equal(second.accepted, 15);
  assert.equal(second.rejected, 5);
  assert.equal(second.remaining, 15);

  const blocked = claimBulk({
    mode: "free",
    used: 25,
    day: "2026-11-03",
    today: "2026-11-03",
    limit: 25,
    requested: 3,
  });
  assert.equal(blocked.accepted, 0);
  assert.equal(blocked.rejected, 3);
});

test("a new UTC day resets the free bulk counter", () => {
  const claim = claimBulk({
    mode: "free",
    used: 25,
    day: "2026-11-03",
    today: "2026-11-04",
    limit: 25,
    requested: 4,
  });
  assert.equal(claim.accepted, 4);
  assert.equal(claim.used, 0);
  assert.equal(claim.nextUsed, 4);
});

test("licensed mode does not apply the bulk cap", () => {
  const claim = claimBulk({
    mode: "licensed",
    used: 25,
    day: "2026-11-03",
    today: "2026-11-03",
    limit: 25,
    requested: 100,
  });
  assert.equal(claim.accepted, 100);
  assert.equal(claim.rejected, 0);
  assert.equal(claim.limit, null);
});

test("missing or invalid FREE_BULK_DAILY_LIMIT falls back to the default", () => {
  assert.equal(freeBulkDailyLimit({}), DEFAULT_FREE_BULK_DAILY_LIMIT);
  assert.equal(freeBulkDailyLimit({ FREE_BULK_DAILY_LIMIT: "0" }), DEFAULT_FREE_BULK_DAILY_LIMIT);
  assert.equal(freeBulkDailyLimit({ FREE_BULK_DAILY_LIMIT: "nope" }), DEFAULT_FREE_BULK_DAILY_LIMIT);
  assert.equal(freeBulkDailyLimit({ FREE_BULK_DAILY_LIMIT: "10" }), 10);
});

test("public license view does not claim single checks are capped", () => {
  const free = licensePublicView({ mode: "free" }, { FREE_BULK_DAILY_LIMIT: "25" });
  assert.equal(free.mode, "free");
  assert.equal(free.bulkDailyLimit, 25);
  assert.equal(free.singleCheckCapped, false);
  assert.match(free.message, /25 bulk addresses/);
  assert.match(free.message, /Single-address checks are not capped/);

  const licensed = licensePublicView({ mode: "licensed" }, {});
  assert.equal(licensed.mode, "licensed");
  assert.equal(licensed.bulkDailyLimit, null);
});

test("no license file resolves to free mode without a network call", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "indus-free-"));
  const prev = process.env.INDUS_SKIP_LICENSE;
  delete process.env.INDUS_SKIP_LICENSE;
  try {
    const access = await resolveAccess(dir);
    assert.equal(access.mode, "free");
    assert.equal(access.reason, "no-license-file");
  } finally {
    if (prev === undefined) delete process.env.INDUS_SKIP_LICENSE;
    else process.env.INDUS_SKIP_LICENSE = prev;
  }
});

test("an expired license file stays in free mode and does not call home", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "indus-expired-"));
  fs.writeFileSync(
    path.join(dir, "indus-license-test.json"),
    JSON.stringify({
      licenseToken: "not-a-real-token",
      expiresAt: "2000-01-01T00:00:00.000Z",
    })
  );
  const prev = process.env.INDUS_SKIP_LICENSE;
  delete process.env.INDUS_SKIP_LICENSE;
  const originalFetch = global.fetch;
  global.fetch = async () => {
    throw new Error("network should not be called for an expired file");
  };
  try {
    const access = await resolveAccess(dir);
    assert.equal(access.mode, "free");
    assert.equal(access.reason, "license-expired");
    assert.match(access.message, /expired/i);
  } finally {
    global.fetch = originalFetch;
    if (prev === undefined) delete process.env.INDUS_SKIP_LICENSE;
    else process.env.INDUS_SKIP_LICENSE = prev;
  }
});
