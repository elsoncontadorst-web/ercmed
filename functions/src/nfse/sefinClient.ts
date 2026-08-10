/* eslint-disable max-len, require-jsdoc */
import axios from "axios";
import * as https from "https";
import * as zlib from "zlib";

// Endpoint publicado no Portal Nacional da NFS-e para produção restrita.
const RESTRICTED_BASE_URL = "https://sefin.producaorestrita.nfse.gov.br/API/SefinNacional";
const PRODUCTION_BASE_URL = "https://sefin.nfse.gov.br/SefinNacional";
const PRODUCTION_DANFSE_URL = "https://adn.nfse.gov.br/danfse";

export interface SefinResponse {
  data: unknown;
  authorizedXml?: string;
}

function decodeGzipBase64(value: unknown): string | undefined {
  if (typeof value !== "string" || !value) return undefined;
  try {
    return zlib.gunzipSync(Buffer.from(value, "base64")).toString("utf8");
  } catch {
    return undefined;
  }
}

export async function transmitDpsRestricted(
  signedXml: string,
  pfx: Buffer,
  password: string,
): Promise<SefinResponse> {
  const agent = new https.Agent({pfx, passphrase: password, rejectUnauthorized: true});
  const dpsXmlGZipB64 = zlib.gzipSync(Buffer.from(signedXml, "utf8")).toString("base64");

  const response = await axios.post(
    `${RESTRICTED_BASE_URL}/nfse`,
    {dpsXmlGZipB64},
    {httpsAgent: agent, headers: {"Content-Type": "application/json"}, timeout: 45000},
  );
  const body = response.data as Record<string, unknown>;
  const encodedXml = body?.nfseXmlGZipB64 || body?.xmlGZipB64;
  return {data: body, authorizedXml: decodeGzipBase64(encodedXml)};
}

export async function transmitDpsProduction(
  signedXml: string,
  pfx: Buffer,
  password: string,
): Promise<SefinResponse> {
  const agent = new https.Agent({pfx, passphrase: password, rejectUnauthorized: true});
  const dpsXmlGZipB64 = zlib.gzipSync(Buffer.from(signedXml, "utf8")).toString("base64");
  const response = await axios.post(
    `${PRODUCTION_BASE_URL}/nfse`,
    {dpsXmlGZipB64},
    {httpsAgent: agent, headers: {"Content-Type": "application/json"}, timeout: 45000},
  );
  const body = response.data as Record<string, unknown>;
  const encodedXml = body?.nfseXmlGZipB64 || body?.xmlGZipB64;
  return {data: body, authorizedXml: decodeGzipBase64(encodedXml)};
}

export async function downloadDanfseProduction(accessKey: string, pfx: Buffer, password: string): Promise<Buffer> {
  const agent = new https.Agent({pfx, passphrase: password, rejectUnauthorized: true});
  const response = await axios.get(
    `${PRODUCTION_DANFSE_URL}/${encodeURIComponent(accessKey)}`,
    {httpsAgent: agent, responseType: "arraybuffer", timeout: 45000},
  );
  return Buffer.from(response.data);
}

export async function checkDpsProduction(
  dpsId: string,
  pfx: Buffer,
  password: string,
): Promise<{exists: boolean; data?: unknown}> {
  const agent = new https.Agent({pfx, passphrase: password, rejectUnauthorized: true});
  const url = `${PRODUCTION_BASE_URL}/dps/${encodeURIComponent(dpsId)}`;
  const head = await axios.head(url, {httpsAgent: agent, timeout: 30000, validateStatus: () => true});
  if (head.status === 404) return {exists: false};
  if (head.status < 200 || head.status >= 300) {
    throw new Error(`Consulta da DPS retornou HTTP ${head.status}.`);
  }
  const response = await axios.get(url, {httpsAgent: agent, timeout: 30000});
  return {exists: true, data: response.data};
}

export async function getNfseProduction(
  accessKey: string,
  pfx: Buffer,
  password: string,
): Promise<SefinResponse> {
  const agent = new https.Agent({pfx, passphrase: password, rejectUnauthorized: true});
  const response = await axios.get(
    `${PRODUCTION_BASE_URL}/nfse/${encodeURIComponent(accessKey)}`,
    {httpsAgent: agent, timeout: 30000},
  );
  const body = response.data as Record<string, unknown>;
  const encodedXml = body?.nfseXmlGZipB64 || body?.xmlGZipB64;
  return {data: body, authorizedXml: decodeGzipBase64(encodedXml)};
}
