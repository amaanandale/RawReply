export const COOKIE_ACCESS_TOKEN = "rawreply_access_token";
export const COOKIE_REFRESH_TOKEN = "rawreply_refresh_token";

const IS_PROD = process.env.NODE_ENV === "production";
const ACCESS_TOKEN_MAX_AGE = 15 * 60; // 15 minutes in seconds
const REFRESH_TOKEN_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

/**
 * Configure standard security flags for authentication cookies.
 */
export function getCookieOptions(maxAge) {
  return {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: "lax",
    path: "/",
    maxAge,
  };
}

/**
 * Attach access token and refresh token cookies to a NextResponse.
 */
export function setAuthCookies(response, { accessToken, refreshToken }) {
  if (accessToken) {
    response.cookies.set(COOKIE_ACCESS_TOKEN, accessToken, getCookieOptions(ACCESS_TOKEN_MAX_AGE));
  }
  if (refreshToken) {
    response.cookies.set(COOKIE_REFRESH_TOKEN, refreshToken, getCookieOptions(REFRESH_TOKEN_MAX_AGE));
  }
  return response;
}

/**
 * Clear authentication cookies on logout.
 */
export function clearAuthCookies(response) {
  response.cookies.set(COOKIE_ACCESS_TOKEN, "", {
    ...getCookieOptions(0),
    maxAge: 0,
  });
  response.cookies.set(COOKIE_REFRESH_TOKEN, "", {
    ...getCookieOptions(0),
    maxAge: 0,
  });
  return response;
}

/**
 * Extract tokens from incoming request cookies or headers.
 */
export function getTokensFromRequest(req) {
  let accessToken = null;
  let refreshToken = null;

  // 1. Check cookies
  if (req.cookies && typeof req.cookies.get === "function") {
    accessToken = req.cookies.get(COOKIE_ACCESS_TOKEN)?.value || null;
    refreshToken = req.cookies.get(COOKIE_REFRESH_TOKEN)?.value || null;
  } else if (req.headers) {
    const cookieHeader = req.headers.get("cookie") || "";
    const pairs = cookieHeader.split(";").map((p) => p.trim());
    for (const pair of pairs) {
      if (pair.startsWith(`${COOKIE_ACCESS_TOKEN}=`)) {
        accessToken = pair.substring(COOKIE_ACCESS_TOKEN.length + 1);
      } else if (pair.startsWith(`${COOKIE_REFRESH_TOKEN}=`)) {
        refreshToken = pair.substring(COOKIE_REFRESH_TOKEN.length + 1);
      }
    }
  }

  // 2. Fallback to Authorization: Bearer <token> header for API calls
  if (!accessToken && req.headers?.get) {
    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      accessToken = authHeader.substring(7);
    }
  }

  return { accessToken, refreshToken };
}

