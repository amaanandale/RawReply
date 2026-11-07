import { integrationStore } from "../storage/integration-store.js";

export const MICROSOFT_GRAPH_BASE_URL = "https://graph.microsoft.com/v1.0";
export const MICROSOFT_AUTH_BASE_URL = "https://login.microsoftonline.com/common/oauth2/v2.0";

export const REQUIRED_MICROSOFT_SCOPES = [
  "offline_access",
  "User.Read",
  "Files.ReadWrite",
];

export function isMicrosoftConfigured() {
  return Boolean(
    process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET
  );
}

export function getMicrosoftRedirectUri(req) {
  if (process.env.MICROSOFT_REDIRECT_URI) {
    return process.env.MICROSOFT_REDIRECT_URI.trim();
  }

  let baseUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!baseUrl && req) {
    const proto = req.headers?.get?.("x-forwarded-proto") || "http";
    const host = req.headers?.get?.("host") || "localhost:3000";
    baseUrl = `${proto}://${host}`;
  }

  if (!baseUrl) {
    baseUrl = "http://localhost:3000";
  }

  return `${baseUrl.replace(/\/+$/, "")}/api/auth/microsoft/callback`;
}

/**
 * Exchanges authorization code for Microsoft Graph tokens.
 */
export async function exchangeCodeForMicrosoftTokens({ code, redirectUri }) {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing MICROSOFT_CLIENT_ID or MICROSOFT_CLIENT_SECRET configuration");
  }

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    scope: REQUIRED_MICROSOFT_SCOPES.join(" "),
  });

  const res = await fetch(`${MICROSOFT_AUTH_BASE_URL}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error_description || data.error || "Failed to exchange Microsoft authorization code");
  }

  return data;
}

/**
 * Refreshes an expired Microsoft Graph user access token.
 */
export async function refreshMicrosoftToken(refreshToken) {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing MICROSOFT_CLIENT_ID or MICROSOFT_CLIENT_SECRET configuration");
  }

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    scope: REQUIRED_MICROSOFT_SCOPES.join(" "),
  });

  const res = await fetch(`${MICROSOFT_AUTH_BASE_URL}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error_description || data.error || "Failed to refresh Microsoft token");
  }

  return data;
}

/**
 * Gets a fresh, valid Microsoft Graph access token for an organization.
 * Automatically performs token refresh if expired.
 */
export async function getValidMicrosoftToken(organizationId) {
  const tokens = await integrationStore.getDecryptedTokens(organizationId);
  if (!tokens || !tokens.accessToken) {
    throw new Error("Microsoft Excel is not connected for this organization.");
  }

  const expiresAt = new Date(tokens.tokenExpiresAt).getTime();
  const now = Date.now();
  // Refresh if token expires in less than 5 minutes
  if (expiresAt - now < 5 * 60 * 1000 && tokens.refreshToken) {
    try {
      console.log(
        JSON.stringify({
          level: "info",
          service: "MicrosoftClient",
          action: "refreshing_token",
          organizationId,
        })
      );
      const refreshed = await refreshMicrosoftToken(tokens.refreshToken);
      await integrationStore.saveIntegration(organizationId, {
        accessToken: refreshed.access_token,
        refreshToken: refreshed.refresh_token || tokens.refreshToken,
        expiresIn: refreshed.expires_in,
      });
      return refreshed.access_token;
    } catch (refreshErr) {
      console.error(
        JSON.stringify({
          level: "error",
          service: "MicrosoftClient",
          action: "token_refresh_failed",
          organizationId,
          error: refreshErr.message,
        })
      );
      throw new Error(`Microsoft authentication expired. Please reconnect Excel: ${refreshErr.message}`);
    }
  }

  return tokens.accessToken;
}

/**
 * Fetches user profile from Microsoft Graph.
 */
export async function fetchMicrosoftUserProfile(accessToken) {
  const res = await fetch(`${MICROSOFT_GRAPH_BASE_URL}/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || "Failed to retrieve Microsoft user profile");
  }

  return {
    id: data.id,
    displayName: data.displayName || data.userPrincipalName,
    email: data.mail || data.userPrincipalName,
  };
}

/**
 * Searches user's OneDrive for Excel Workbooks (.xlsx).
 */
export async function listMicrosoftWorkbooks(accessToken) {
  const res = await fetch(
    `${MICROSOFT_GRAPH_BASE_URL}/me/drive/root/search(q='.xlsx')?$select=id,name,webUrl,size,lastModifiedDateTime`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    }
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || "Failed to fetch Excel workbooks from OneDrive");
  }

  return (data.value || [])
    .filter((file) => file.name && file.name.endsWith(".xlsx"))
    .map((file) => ({
      id: file.id,
      name: file.name,
      webUrl: file.webUrl,
      lastModified: file.lastModifiedDateTime,
    }));
}

/**
 * Retrieves worksheets within an Excel workbook.
 */
export async function listMicrosoftWorksheets(accessToken, workbookItemId) {
  const res = await fetch(
    `${MICROSOFT_GRAPH_BASE_URL}/me/drive/items/${workbookItemId}/workbook/worksheets?$select=id,name,position,visibility`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    }
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || "Failed to fetch worksheets from workbook");
  }

  return (data.value || []).map((sheet) => ({
    id: sheet.id,
    name: sheet.name,
    position: sheet.position,
  }));
}

/**
 * Creates a new worksheet in a workbook.
 */
export async function createMicrosoftWorksheet(accessToken, workbookItemId, sheetName = "RawReply Leads") {
  const res = await fetch(
    `${MICROSOFT_GRAPH_BASE_URL}/me/drive/items/${workbookItemId}/workbook/worksheets/add`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ name: sheetName }),
    }
  );

  const data = await res.json();
  if (!res.ok) {
    // If worksheet name already exists, fallback gracefully
    if (data.error?.code === "ItemAlreadyExists") {
      return { name: sheetName, existing: true };
    }
    throw new Error(data.error?.message || "Failed to create worksheet in Excel workbook");
  }

  return data;
}

/**
 * Appends qualified lead rows into an authorized Excel worksheet.
 * Preserves existing data and appends at the bottom.
 */
export async function appendLeadsToExcelWorkbook(accessToken, workbookItemId, worksheetName, leads) {
  if (!Array.isArray(leads) || leads.length === 0) {
    return { appendedCount: 0 };
  }

  // 1. Prepare row data array
  // Format: [Name, Instagram Username, Mobile Number, Country Code, Instagram Account, Automation, Source Post, Lead Status, Submitted At]
  const rows = leads.map((lead) => [
    lead.name || "",
    lead.instagramUsername || "",
    lead.phoneNumber || "",
    lead.countryCode || "",
    lead.instagramAccountId || "",
    lead.sourceAutomationName || "",
    lead.sourcePostId || "",
    lead.status || "new",
    lead.submittedAt || new Date().toISOString(),
  ]);

  // Headers definition
  const HEADERS = [
    "Name",
    "Instagram Username",
    "Mobile Number",
    "Country Code",
    "Instagram Account",
    "Automation",
    "Source Post",
    "Lead Status",
    "Submitted At",
  ];

  const encodedSheet = encodeURIComponent(worksheetName);

  // 2. Check used range to find insertion point
  const usedRangeRes = await fetch(
    `${MICROSOFT_GRAPH_BASE_URL}/me/drive/items/${workbookItemId}/workbook/worksheets('${encodedSheet}')/usedRange`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    }
  );

  let nextRow = 1;
  let hasHeaders = false;

  if (usedRangeRes.ok) {
    const usedData = await usedRangeRes.json();
    if (usedData.rowCount && usedData.rowCount > 0) {
      nextRow = usedData.rowCount + 1;
      hasHeaders = true;
    }
  }

  // 3. If sheet is brand new/empty, write headers first
  if (!hasHeaders) {
    await fetch(
      `${MICROSOFT_GRAPH_BASE_URL}/me/drive/items/${workbookItemId}/workbook/worksheets('${encodedSheet}')/range(address='A1:I1')`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          values: [HEADERS],
        }),
      }
    );
    nextRow = 2;
  }

  // 4. Append lead rows
  const endRow = nextRow + rows.length - 1;
  const targetAddress = `A${nextRow}:I${endRow}`;

  const appendRes = await fetch(
    `${MICROSOFT_GRAPH_BASE_URL}/me/drive/items/${workbookItemId}/workbook/worksheets('${encodedSheet}')/range(address='${targetAddress}')`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        values: rows,
      }),
    }
  );

  const appendData = await appendRes.json();
  if (!appendRes.ok) {
    throw new Error(appendData.error?.message || "Failed to append rows to Excel worksheet");
  }

  return {
    appendedCount: rows.length,
    targetRange: targetAddress,
  };
}

