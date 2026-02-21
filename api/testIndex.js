const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

async function testIndex() {
  const KIS_APP_KEY = process.env.KIS_APP_KEY;
  const KIS_SECRET_KEY = process.env.KIS_SECRET_KEY;
  const KIS_BASE_URL = 'https://openapi.koreainvestment.com:9443';

  console.log("TEST START");
  try {
    const tRes = await axios.post(`${KIS_BASE_URL}/oauth2/tokenP`, {
      appkey: KIS_APP_KEY, appsecret: KIS_SECRET_KEY, grant_type: 'client_credentials'
    });
    const t = tRes.data.access_token;
    console.log("TOKEN OK");

    const kospi = await axios.get(`${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-index-price`, {
      headers: { 'authorization': `Bearer ${t}`, 'appkey': KIS_APP_KEY, 'appsecret': KIS_SECRET_KEY, 'tr_id': 'FHPST01010000', 'custtype': 'P' },
      params: { 'FID_COND_MRKT_DIV_CODE': 'U', 'FID_INPUT_ISCD': '001' }
    });
    console.log("KOSPI:", JSON.stringify(kospi.data.output));

    const nasdaq = await axios.get(`${KIS_BASE_URL}/uapi/overseas-price/v1/quotations/inquire-price-index`, {
      headers: { 'authorization': `Bearer ${t}`, 'appkey': KIS_APP_KEY, 'appsecret': KIS_SECRET_KEY, 'tr_id': 'FHKST03010100', 'custtype': 'P' },
      params: { 'FID_COND_MRKT_DIV_CODE': 'N', 'FID_INPUT_ISCD': '.IXIC' }
    });
    console.log("NASDAQ:", JSON.stringify(nasdaq.data.output));
  } catch (e) { console.error("ERR:", e.message); }
}
testIndex();