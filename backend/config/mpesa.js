/**
 * M-Pesa Configuration
 * ─────────────────────────────────────────────────────────────────────────────
 * Kenya:  Safaricom Daraja API  →  https://developer.safaricom.co.ke
 * Africa: M-Pesa Africa API    →  https://openapiportal.m-pesa.com
 */
const axios = require("axios");

// ─── KENYA: Daraja STK Push ───────────────────────────────────────────────────

const DARAJA_BASE = process.env.MPESA_ENV === "production"
  ? "https://api.safaricom.co.ke"
  : "https://sandbox.safaricom.co.ke";

// Get OAuth token from Daraja
async function getDarajaToken() {
  const creds = Buffer.from(
    `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
  ).toString("base64");

  const { data } = await axios.get(
    `${DARAJA_BASE}/oauth/v1/generate?grant_type=client_credentials`,
    { headers: { Authorization: `Basic ${creds}` } }
  );
  return data.access_token;
}

// Format phone: 0712345678 → 254712345678
function formatKEPhone(phone) {
  phone = String(phone).replace(/\s/g, "");
  if (phone.startsWith("+254")) return phone.slice(1);
  if (phone.startsWith("0"))   return "254" + phone.slice(1);
  return phone;
}

// STK Push — sends payment prompt to customer's phone
async function stkPush({ phone, amount, orderId }) {
  const token     = await getDarajaToken();
  const timestamp = new Date()
    .toISOString().replace(/[^0-9]/g, "").slice(0, 14);
  const password  = Buffer.from(
    process.env.MPESA_SHORTCODE + process.env.MPESA_PASSKEY + timestamp
  ).toString("base64");

  const { data } = await axios.post(
    `${DARAJA_BASE}/mpesa/stkpush/v1/processrequest`,
    {
      BusinessShortCode: process.env.MPESA_SHORTCODE,
      Password:          password,
      Timestamp:         timestamp,
      TransactionType:   "CustomerPayBillOnline",
      Amount:            Math.ceil(amount),
      PartyA:            formatKEPhone(phone),
      PartyB:            process.env.MPESA_SHORTCODE,
      PhoneNumber:       formatKEPhone(phone),
      CallBackURL:       `${process.env.SERVER_URL}/api/payments/mpesa/callback`,
      AccountReference:  `ZA-${orderId}`,
      TransactionDesc:   "ZoeAfrica Order",
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return data;
}

// STK Query — poll payment status
async function stkQuery(checkoutRequestId) {
  const token     = await getDarajaToken();
  const timestamp = new Date()
    .toISOString().replace(/[^0-9]/g, "").slice(0, 14);
  const password  = Buffer.from(
    process.env.MPESA_SHORTCODE + process.env.MPESA_PASSKEY + timestamp
  ).toString("base64");

  const { data } = await axios.post(
    `${DARAJA_BASE}/mpesa/stkpushquery/v1/query`,
    {
      BusinessShortCode: process.env.MPESA_SHORTCODE,
      Password:          password,
      Timestamp:         timestamp,
      CheckoutRequestID: checkoutRequestId,
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return data;
}

// ─── M-PESA AFRICA: C2B (other African countries) ────────────────────────────

const AFRICA_BASE = "https://openapi.m-pesa.com";

// Country codes → M-Pesa Africa market codes
const COUNTRY_MAP = {
  TZ: "Tanzania", MZ: "Mozambique", RW: "Rwanda",
  ET: "Ethiopia",  GH: "Ghana",     EG: "Egypt",
  CD: "DRC",       LS: "Lesotho",   ZM: "Zambia",
};

async function getMpesaAfricaToken() {
  const { data } = await axios.post(
    `${AFRICA_BASE}/sandbox/ipg/v2/vodacomTZN/getSession/`,
    {},
    {
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${process.env.MPESA_AFRICA_API_KEY}:${process.env.MPESA_AFRICA_PUBLIC_KEY}`
        ).toString("base64")}`,
        Origin: "*",
      },
    }
  );
  return data.output_SessionID;
}

async function mpesaAfricaC2B({ phone, amount, orderId, country = "TZ" }) {
  const session  = await getMpesaAfricaToken();
  const { data } = await axios.post(
    `${AFRICA_BASE}/sandbox/ipg/v2/vodacomTZN/c2bPayment/singleStage/`,
    {
      input_Amount:              String(Math.ceil(amount)),
      input_Country:             country,
      input_Currency:            "USD",
      input_CustomerMSISDN:      phone,
      input_ServiceProviderCode: process.env.MPESA_AFRICA_SERVICE_CODE,
      input_ThirdPartyConversationID: `ZA-${orderId}-${Date.now()}`,
      input_TransactionReference: `ZA-${orderId}`,
      input_PurchasedItemsDesc:  "ZoeAfrica Order",
    },
    { headers: { Authorization: `Bearer ${session}`, Origin: "*" } }
  );
  return data;
}

module.exports = { stkPush, stkQuery, mpesaAfricaC2B };
