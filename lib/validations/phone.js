/**
 * Phone Number Validation and E.164 Normalization.
 * 
 * In RawReply, ONLY individuals who submit a valid international mobile number
 * qualify as leads.
 */

// Basic country dial codes mapping for prefix extraction
const COMMON_COUNTRY_CODES = [
  { code: "+1", length: 10, country: "US/CA" },
  { code: "+44", length: 10, country: "GB" },
  { code: "+91", length: 10, country: "IN" },
  { code: "+61", length: 9, country: "AU" },
  { code: "+49", length: 11, country: "DE" },
  { code: "+33", length: 9, country: "FR" },
  { code: "+81", length: 10, country: "JP" },
  { code: "+86", length: 11, country: "CN" },
  { code: "+971", length: 9, country: "AE" },
  { code: "+966", length: 9, country: "SA" },
  { code: "+55", length: 11, country: "BR" },
  { code: "+52", length: 10, country: "MX" },
  { code: "+27", length: 9, country: "ZA" },
  { code: "+34", length: 9, country: "ES" },
  { code: "+39", length: 10, country: "IT" },
  { code: "+65", length: 8, country: "SG" },
  { code: "+60", length: 10, country: "MY" },
  { code: "+62", length: 11, country: "ID" },
  { code: "+63", length: 10, country: "PH" },
  { code: "+92", length: 10, country: "PK" },
  { code: "+880", length: 10, country: "BD" },
  { code: "+234", length: 10, country: "NG" },
  { code: "+254", length: 9, country: "KE" },
  { code: "+20", length: 10, country: "EG" },
];

/**
 * Validates and normalizes any phone number into E.164 format (+[country][national]).
 *
 * Rules:
 * 1. Must contain between 7 and 15 digits (ITU-T E.164 recommendation).
 * 2. Letters and disallowed characters are rejected.
 * 3. Spaces, dashes, dots, and parentheses are stripped.
 * 4. Leading 00 is normalized to +.
 * 5. Returns countryCode and normalized E.164 string.
 */
export function validateAndNormalizePhone(rawPhone, defaultCountryCode = "+1") {
  if (!rawPhone || typeof rawPhone !== "string") {
    return {
      isValid: false,
      error: "Phone number is required.",
      normalized: null,
      countryCode: null,
      nationalNumber: null,
    };
  }

  const trimmed = rawPhone.trim();

  // Reject strings with alphabetic characters
  if (/[a-zA-Z]/.test(trimmed)) {
    return {
      isValid: false,
      error: "Phone number contains invalid alphabetic characters.",
      normalized: null,
      countryCode: null,
      nationalNumber: null,
    };
  }

  // Normalize international prefix: 00 -> +
  let cleaned = trimmed;
  if (cleaned.startsWith("00")) {
    cleaned = "+" + cleaned.slice(2);
  }

  // Check if international + was supplied
  const hasPlus = cleaned.startsWith("+");

  // Strip all non-digit characters except leading +
  const digitsOnly = cleaned.replace(/\D/g, "");

  if (digitsOnly.length < 7) {
    return {
      isValid: false,
      error: "Phone number is too short (minimum 7 digits required).",
      normalized: null,
      countryCode: null,
      nationalNumber: null,
    };
  }

  if (digitsOnly.length > 15) {
    return {
      isValid: false,
      error: "Phone number is too long (maximum 15 digits per E.164 standard).",
      normalized: null,
      countryCode: null,
      nationalNumber: null,
    };
  }

  let normalized = "";
  let countryCode = defaultCountryCode;
  let nationalNumber = digitsOnly;

  if (hasPlus) {
    // Attempt matching against known country codes
    const fullWithPlus = `+${digitsOnly}`;
    const matched = COMMON_COUNTRY_CODES
      .slice()
      .sort((a, b) => b.code.length - a.code.length)
      .find((item) => fullWithPlus.startsWith(item.code));

    if (matched) {
      countryCode = matched.code;
      nationalNumber = fullWithPlus.slice(matched.code.length);
    } else {
      // General fallback: first 1-3 digits
      if (digitsOnly.length >= 11) {
        countryCode = `+${digitsOnly.slice(0, 2)}`;
        nationalNumber = digitsOnly.slice(2);
      } else {
        countryCode = `+${digitsOnly.slice(0, 1)}`;
        nationalNumber = digitsOnly.slice(1);
      }
    }
    normalized = fullWithPlus;
  } else {
    // Number submitted without leading +
    // Check if the number already begins with the default country code digits (e.g. 1 for US)
    const defDigits = defaultCountryCode.replace(/\D/g, "");
    if (digitsOnly.startsWith(defDigits) && digitsOnly.length > defDigits.length + 6) {
      countryCode = defaultCountryCode;
      nationalNumber = digitsOnly.slice(defDigits.length);
      normalized = `+${digitsOnly}`;
    } else {
      countryCode = defaultCountryCode;
      nationalNumber = digitsOnly;
      normalized = `${defaultCountryCode}${digitsOnly}`;
    }
  }

  // Final check on normalized E.164 structure: +[1-9][0-9]{6,14}
  const e164Regex = /^\+[1-9]\d{6,14}$/;
  if (!e164Regex.test(normalized)) {
    return {
      isValid: false,
      error: "Resulting number does not conform to E.164 international standard.",
      normalized: null,
      countryCode: null,
      nationalNumber: null,
    };
  }

  return {
    isValid: true,
    error: null,
    normalized,
    countryCode,
    nationalNumber,
  };
}

