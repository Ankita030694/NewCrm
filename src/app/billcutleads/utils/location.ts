const STATE_MATCHERS: Array<{ match: string; label: string }> = [
  { match: "ANDHRA PRADESH", label: "Andhra Pradesh" },
  { match: "ARUNACHAL PRADESH", label: "Arunachal Pradesh" },
  { match: "ASSAM", label: "Assam" },
  { match: "BIHAR", label: "Bihar" },
  { match: "CHHATTISGARH", label: "Chhattisgarh" },
  { match: "GOA", label: "Goa" },
  { match: "GUJARAT", label: "Gujarat" },
  { match: "HARYANA", label: "Haryana" },
  { match: "HIMACHAL PRADESH", label: "Himachal Pradesh" },
  { match: "JHARKHAND", label: "Jharkhand" },
  { match: "KARNATAKA", label: "Karnataka" },
  { match: "KERALA", label: "Kerala" },
  { match: "MADHYA PRADESH", label: "Madhya Pradesh" },
  { match: "MAHARASHTRA", label: "Maharashtra" },
  { match: "MANIPUR", label: "Manipur" },
  { match: "MEGHALAYA", label: "Meghalaya" },
  { match: "MIZORAM", label: "Mizoram" },
  { match: "NAGALAND", label: "Nagaland" },
  { match: "ODISHA", label: "Odisha" },
  { match: "PUNJAB", label: "Punjab" },
  { match: "RAJASTHAN", label: "Rajasthan" },
  { match: "SIKKIM", label: "Sikkim" },
  { match: "TAMIL NADU", label: "Tamil Nadu" },
  { match: "TELANGANA", label: "Telangana" },
  { match: "TRIPURA", label: "Tripura" },
  { match: "UTTAR PRADESH", label: "Uttar Pradesh" },
  { match: "UTTARAKHAND", label: "Uttarakhand" },
  { match: "WEST BENGAL", label: "West Bengal" },
  { match: "DELHI", label: "Delhi" },
  { match: "JAMMU AND KASHMIR", label: "Jammu & Kashmir" },
  { match: "LADAKH", label: "Ladakh" },
  { match: "PUDUCHERRY", label: "Puducherry" },
]

const sanitizeString = (value: unknown): string => {
  if (typeof value !== "string") return ""
  return value.trim()
}

const sanitizePincode = (value: unknown): string => {
  const sanitized = sanitizeString(value)
  if (sanitized.length < 6) return ""
  return sanitized.substring(0, 6)
}

export const extractPincodeFromAddress = (address: unknown): string => {
  const sanitizedAddress = sanitizeString(address)
  if (!sanitizedAddress) return ""
  const pincodeMatch = sanitizedAddress.match(/\b\d{6}\b/)
  return pincodeMatch ? pincodeMatch[0] : ""
}

export const extractStateFromAddress = (address: unknown): string => {
  const sanitizedAddress = sanitizeString(address)
  if (!sanitizedAddress) return ""

  const addressUpper = sanitizedAddress.toUpperCase()
  for (const { match, label } of STATE_MATCHERS) {
    if (addressUpper.includes(match)) {
      return label
    }
  }

  return ""
}

export const getStateFromPincode = (pincode: unknown): string => {
  const sanitizedPincode = sanitizePincode(pincode)
  if (!sanitizedPincode) return ""

  const firstTwoDigits = sanitizedPincode.substring(0, 2)
  const firstThreeDigits = sanitizedPincode.substring(0, 3)

  if (firstThreeDigits === "682") return "Lakshadweep"
  if (firstThreeDigits === "744") return "Andaman & Nicobar"

  const digits = Number.parseInt(firstTwoDigits, 10)
  if (Number.isNaN(digits)) return ""

  if (digits === 11) return "Delhi"
  if (digits >= 12 && digits <= 13) return "Haryana"
  if (digits >= 14 && digits <= 16) return "Punjab"
  if (digits === 17) return "Himachal Pradesh"
  if (digits >= 18 && digits <= 19) return "Jammu & Kashmir"
  if (digits === 20) return "Uttarakhand"
  if (digits >= 21 && digits <= 28) return "Uttar Pradesh"
  if (digits >= 30 && digits <= 34) return "Rajasthan"
  if (digits >= 36 && digits <= 39) return "Gujarat"
  if (digits >= 40 && digits <= 44) return "Maharashtra"
  if (digits >= 45 && digits <= 48) return "Madhya Pradesh"
  if (digits === 49) return "Chhattisgarh"
  if (digits >= 50 && digits <= 53) return "Andhra Pradesh & Telangana"
  if (digits === 54 || digits === 55) return "Andhra Pradesh"
  if (digits >= 56 && digits <= 59) return "Karnataka"
  if (digits >= 60 && digits <= 64) return "Tamil Nadu"
  if (digits >= 67 && digits <= 69) return "Kerala"
  if (digits === 66) return "Puducherry"
  if (digits >= 70 && digits <= 74) return "West Bengal"
  if (digits === 75 || digits === 76) return "Odisha"
  if (digits === 77) return "Andhra Pradesh"
  if (digits === 78) return "Assam"
  if (digits === 79) return "North Eastern States"
  if (digits >= 80 && digits <= 82) return "Bihar"
  if (digits >= 83 && digits <= 85) return "Jharkhand"
  if (digits >= 86 && digits <= 89) return "North Eastern States"
  if (digits >= 90 && digits <= 99) return "Armed Forces"

  return ""
}

type LeadLocationSource = Record<string, unknown>

const DIRECT_FIELD_ORDER: string[] = [
  "state",
  "State",
  "state_name",
  "city",
  "City",
  "location",
  "Location",
  "region",
  "Region",
]

const PINCODE_FIELD_ORDER: string[] = [
  "pincode",
  "pin",
  "postal_code",
  "postalCode",
  "zip",
  "zipcode",
  "zipCode",
]

export const resolveLeadState = (data: LeadLocationSource): string => {
  for (const field of DIRECT_FIELD_ORDER) {
    const value = sanitizeString(data[field])
    if (value) {
      return value
    }
  }

  const address = sanitizeString(data["address"])

  for (const field of PINCODE_FIELD_ORDER) {
    const candidate = sanitizePincode(data[field])
    if (candidate) {
      const stateFromPin = getStateFromPincode(candidate)
      if (stateFromPin) {
        return stateFromPin
      }
    }
  }

  const stateFromAddress = extractStateFromAddress(address)
  if (stateFromAddress) {
    return stateFromAddress
  }

  const pincodeFromAddress = extractPincodeFromAddress(address)
  if (pincodeFromAddress) {
    const stateFromPin = getStateFromPincode(pincodeFromAddress)
    if (stateFromPin) {
      return stateFromPin
    }
  }

  return "Unknown State"
}


