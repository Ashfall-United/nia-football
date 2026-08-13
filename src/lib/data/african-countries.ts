function flagEmoji(isoCode: string): string {
  return String.fromCodePoint(
    ...isoCode
      .toUpperCase()
      .split("")
      .map((char) => 127397 + char.charCodeAt(0)),
  );
}

const AFRICAN_COUNTRY_CODES: Record<string, string> = {
  DZ: "Algeria",
  AO: "Angola",
  BJ: "Benin",
  BW: "Botswana",
  BF: "Burkina Faso",
  BI: "Burundi",
  CV: "Cabo Verde",
  CM: "Cameroon",
  CF: "Central African Republic",
  TD: "Chad",
  KM: "Comoros",
  CG: "Congo",
  CD: "Congo (DRC)",
  CI: "Côte d'Ivoire",
  DJ: "Djibouti",
  EG: "Egypt",
  GQ: "Equatorial Guinea",
  ER: "Eritrea",
  SZ: "Eswatini",
  ET: "Ethiopia",
  GA: "Gabon",
  GM: "Gambia",
  GH: "Ghana",
  GN: "Guinea",
  GW: "Guinea-Bissau",
  KE: "Kenya",
  LS: "Lesotho",
  LR: "Liberia",
  LY: "Libya",
  MG: "Madagascar",
  MW: "Malawi",
  ML: "Mali",
  MR: "Mauritania",
  MU: "Mauritius",
  MA: "Morocco",
  MZ: "Mozambique",
  NA: "Namibia",
  NE: "Niger",
  NG: "Nigeria",
  RW: "Rwanda",
  ST: "Sao Tome and Principe",
  SN: "Senegal",
  SC: "Seychelles",
  SL: "Sierra Leone",
  SO: "Somalia",
  ZA: "South Africa",
  SS: "South Sudan",
  SD: "Sudan",
  TZ: "Tanzania",
  TG: "Togo",
  TN: "Tunisia",
  UG: "Uganda",
  ZM: "Zambia",
  ZW: "Zimbabwe",
};

export type Country = {
  code: string;
  name: string;
  flag: string;
};

export const AFRICAN_COUNTRIES: Country[] = Object.entries(
  AFRICAN_COUNTRY_CODES,
)
  .map(([code, name]) => ({ code, name, flag: flagEmoji(code) }))
  .sort((a, b) => a.name.localeCompare(b.name));

export const AFRICAN_COUNTRY_CODE_SET = new Set(
  AFRICAN_COUNTRIES.map((c) => c.code),
);
