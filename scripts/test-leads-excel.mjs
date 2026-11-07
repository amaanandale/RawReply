import assert from "assert";
import { validateAndNormalizePhone } from "../lib/validations/phone.js";
import { leadStore, LEAD_STATUSES } from "../lib/storage/lead-store.js";
import { exportStore } from "../lib/storage/export-store.js";
import { integrationStore } from "../lib/storage/integration-store.js";
import { generateLeadsXlsx } from "../lib/export/xlsx.js";
import {
  isMicrosoftConfigured,
  getMicrosoftRedirectUri,
  REQUIRED_MICROSOFT_SCOPES,
} from "../lib/integrations/microsoft.js";

async function runTests() {
  console.log("=================================================");
  console.log("RawReply Qualified Leads & Excel Test Suite");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ FAIL: ${name}`);
      console.error(`   ${err.message}`);
      failed++;
    }
  }

  async function asyncTest(name, fn) {
    try {
      await fn();
      console.log(`✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ FAIL: ${name}`);
      console.error(`   ${err.message}`);
      failed++;
    }
  }

  // ─── 1. Phone Number Validation & E.164 Normalization ───────────
  test("Normalizes standard US number with formatting to E.164", () => {
    const res = validateAndNormalizePhone("(555) 123-4567");
    assert.strictEqual(res.isValid, true);
    assert.strictEqual(res.normalized, "+15551234567");
    assert.strictEqual(res.countryCode, "+1");
  });

  test("Normalizes UK international number", () => {
    const res = validateAndNormalizePhone("+44 7911 123456");
    assert.strictEqual(res.isValid, true);
    assert.strictEqual(res.normalized, "+447911123456");
    assert.strictEqual(res.countryCode, "+44");
  });

  test("Normalizes leading 00 international prefix to +", () => {
    const res = validateAndNormalizePhone("0091 98765 43210");
    assert.strictEqual(res.isValid, true);
    assert.strictEqual(res.normalized, "+919876543210");
    assert.strictEqual(res.countryCode, "+91");
  });

  test("Rejects phone number with letters", () => {
    const res = validateAndNormalizePhone("+1555-CALL-NOW");
    assert.strictEqual(res.isValid, false);
    assert.ok(res.error.includes("alphabetic"));
  });

  test("Rejects too-short phone number", () => {
    const res = validateAndNormalizePhone("12345");
    assert.strictEqual(res.isValid, false);
    assert.ok(res.error.includes("too short"));
  });

  test("Rejects empty or non-string input", () => {
    const res = validateAndNormalizePhone("");
    assert.strictEqual(res.isValid, false);
  });

  // ─── 2. Qualified Lead Qualification Rules & Storage ───────────
  const testOrgA = `test_org_leads_A_${Date.now()}`;
  const testOrgB = `test_org_leads_B_${Date.now()}`;

  await asyncTest("Creates qualified lead only when valid phone is provided", async () => {
    const result = await leadStore.createOrUpdateLead({
      organizationId: testOrgA,
      instagramAccountId: "ig_acc_101",
      instagramUsername: "@buyer_alex",
      name: "Alex Buyer",
      phoneNumber: "+15559876543",
      sourceAutomationId: "auto_summer_promo",
      sourceAutomationName: "Summer Promo DM",
      sourcePostId: "post_445566",
    });

    assert.strictEqual(result.isNew, true);
    assert.strictEqual(result.lead.phoneNumber, "+15559876543");
    assert.strictEqual(result.lead.countryCode, "+1");
    assert.strictEqual(result.lead.status, LEAD_STATUSES.NEW);
    assert.strictEqual(result.lead.exportedToExcel, false);
  });

  await asyncTest("Rejects lead creation when phone number is invalid", async () => {
    await assert.rejects(
      async () => {
        await leadStore.createOrUpdateLead({
          organizationId: testOrgA,
          instagramAccountId: "ig_acc_101",
          instagramUsername: "@invalid_user",
          phoneNumber: "invalid_phone_text",
        });
      },
      /Lead rejected/
    );
  });

  // ─── 3. Idempotent Deduplication ────────────────────────────────
  await asyncTest("Duplicate submission updates existing lead without creating duplicates", async () => {
    const resultDuplicate = await leadStore.createOrUpdateLead({
      organizationId: testOrgA,
      instagramAccountId: "ig_acc_101",
      instagramUsername: "@buyer_alex",
      name: "Alex Buyer Updated",
      phoneNumber: "+1 (555) 987-6543", // Same phone formatted differently
      sourcePostId: "post_999999",
    });

    assert.strictEqual(resultDuplicate.isNew, false);
    assert.strictEqual(resultDuplicate.lead.name, "Alex Buyer Updated");
    assert.strictEqual(resultDuplicate.lead.sourcePostId, "post_999999");

    const list = await leadStore.listLeads(testOrgA);
    // Should still only have 1 lead for this phone
    const matching = list.leads.filter((l) => l.phoneNumber === "+15559876543");
    assert.strictEqual(matching.length, 1);
  });

  // ─── 4. Multi-Tenant Organization Isolation ────────────────────
  await asyncTest("Enforces strict organization-level isolation", async () => {
    // Org B creates lead with different phone
    await leadStore.createOrUpdateLead({
      organizationId: testOrgB,
      instagramAccountId: "ig_acc_202",
      instagramUsername: "@buyer_bob",
      phoneNumber: "+15551112233",
    });

    const listA = await leadStore.listLeads(testOrgA);
    const listB = await leadStore.listLeads(testOrgB);

    assert.strictEqual(listA.leads.some((l) => l.phoneNumber === "+15551112233"), false);
    assert.strictEqual(listB.leads.some((l) => l.phoneNumber === "+15559876543"), false);
  });

  // ─── 5. Status Management & Internal Notes ─────────────────────
  await asyncTest("Updates lead status and appends internal notes", async () => {
    const listA = await leadStore.listLeads(testOrgA);
    const leadId = listA.leads[0].id;

    // Update status to 'contacted'
    const updated = await leadStore.updateLeadStatus(testOrgA, leadId, LEAD_STATUSES.CONTACTED);
    assert.strictEqual(updated.status, LEAD_STATUSES.CONTACTED);

    // Add internal note
    const note = await leadStore.addLeadNote(testOrgA, leadId, {
      text: "Called customer, interested in enterprise tier",
      authorName: "Sarah Admin",
    });

    assert.strictEqual(note.text, "Called customer, interested in enterprise tier");
    assert.strictEqual(note.authorName, "Sarah Admin");

    const refreshed = await leadStore.getLead(testOrgA, leadId);
    assert.strictEqual(refreshed.notes.length, 1);
    assert.strictEqual(refreshed.notes[0].text, "Called customer, interested in enterprise tier");
  });

  // ─── 6. OpenXML .xlsx Spreadsheet Generator ─────────────────────
  test("Generates valid OpenXML PKZIP .xlsx binary buffer", () => {
    const mockLeads = [
      {
        name: "Test Customer",
        instagramUsername: "@test_cust",
        phoneNumber: "+15551234567",
        countryCode: "+1",
        instagramAccountId: "ig_123",
        sourceAutomationName: "Welcome Flow",
        sourcePostId: "post_111",
        status: "qualified",
        submittedAt: "2026-11-07T12:00:00Z",
      },
    ];

    const buffer = generateLeadsXlsx(mockLeads);
    assert.ok(Buffer.isBuffer(buffer));
    assert.ok(buffer.length > 500);

    // Check PKZIP header signature (0x04034b50 -> 'PK\x03\x04')
    assert.strictEqual(buffer[0], 0x50); // 'P'
    assert.strictEqual(buffer[1], 0x4b); // 'K'
    assert.strictEqual(buffer[2], 0x03);
    assert.strictEqual(buffer[3], 0x04);
  });

  // ─── 7. Export History & Marking Exported ───────────────────────
  await asyncTest("Records export history and updates lead export status", async () => {
    const listA = await leadStore.listLeads(testOrgA);
    const leadId = listA.leads[0].id;

    // Mark as exported
    const markedCount = await leadStore.markLeadsExported(testOrgA, [leadId], "Microsoft Excel");
    assert.strictEqual(markedCount, 1);

    const leadAfter = await leadStore.getLead(testOrgA, leadId);
    assert.strictEqual(leadAfter.exportedToExcel, true);
    assert.ok(leadAfter.exportedAt);

    // Record export event
    const record = await exportStore.recordExport({
      organizationId: testOrgA,
      exportType: "xlsx_download",
      leadsCount: 1,
      destination: "Local Spreadsheet",
      exportedBy: "Test User",
    });

    assert.strictEqual(record.leadsCount, 1);
    assert.strictEqual(record.status, "success");

    const history = await exportStore.listHistory(testOrgA);
    assert.ok(history.length >= 1);
    assert.strictEqual(history[0].destination, "Local Spreadsheet");
  });

  // ─── 8. Microsoft Integration Store & Token Encryption ─────────
  await asyncTest("IntegrationStore encrypts Microsoft tokens and strips them on public read", async () => {
    const rawAccessToken = "mock_ms_access_token_123456789";
    const rawRefreshToken = "mock_ms_refresh_token_987654321";

    await integrationStore.saveIntegration(testOrgA, {
      microsoftUserId: "ms_usr_999",
      accountEmail: "founder@company.com",
      displayName: "Company Founder",
      accessToken: rawAccessToken,
      refreshToken: rawRefreshToken,
      expiresIn: 3600,
      scopes: REQUIRED_MICROSOFT_SCOPES,
    });

    // Public read must NOT leak raw tokens
    const publicInfo = await integrationStore.getIntegration(testOrgA);
    assert.strictEqual(publicInfo.connected, true);
    assert.strictEqual(publicInfo.accountEmail, "founder@company.com");
    assert.strictEqual(publicInfo.encryptedAccessToken, undefined);
    assert.strictEqual(publicInfo.accessToken, undefined);

    // Server decrypted read
    const decrypted = await integrationStore.getDecryptedTokens(testOrgA);
    assert.strictEqual(decrypted.accessToken, rawAccessToken);
    assert.strictEqual(decrypted.refreshToken, rawRefreshToken);

    // Workbook config update
    await integrationStore.updateWorkbookConfig(testOrgA, {
      workbook: { id: "wb_123", name: "Leads.xlsx" },
      worksheet: { id: "ws_456", name: "RawReply Leads" },
    });

    const updatedInfo = await integrationStore.getIntegration(testOrgA);
    assert.strictEqual(updatedInfo.selectedWorkbook.name, "Leads.xlsx");

    // Disconnect
    await integrationStore.disconnect(testOrgA);
    const disconnectedInfo = await integrationStore.getIntegration(testOrgA);
    assert.strictEqual(disconnectedInfo.connected, false);
  });

  // ─── 9. Microsoft Redirect URI derivation ──────────────────────
  test("getMicrosoftRedirectUri normalization", () => {
    const uri = getMicrosoftRedirectUri();
    assert.ok(uri.includes("/api/auth/microsoft/callback"));
    assert.strictEqual(uri.includes("//api"), false);
  });

  console.log("\n=================================================");
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();

