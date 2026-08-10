/* eslint-disable max-len, require-jsdoc, @typescript-eslint/ban-ts-comment */
import * as crypto from "crypto";
// node-forge nao publica tipos completos para a API PKCS#12 utilizada aqui.
// @ts-ignore
import * as forge from "node-forge";

export interface CertificateMaterial {
  certificatePem: string;
  privateKeyPem: string;
  expiresAt: Date;
  subject: string;
  document?: string;
}

interface EncryptedValue {
  iv: string;
  tag: string;
  data: string;
}

function encryptionKey(secret: string): Buffer {
  const key = Buffer.from(secret, "base64");
  if (key.length !== 32) {
    throw new Error("NFSE_CERTIFICATE_KEY deve ser uma chave Base64 de 32 bytes.");
  }
  return key;
}

export function encryptValue(value: Buffer | string, secret: string): EncryptedValue {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(secret), iv);
  const encrypted = Buffer.concat([cipher.update(value), cipher.final()]);
  return {
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    data: encrypted.toString("base64"),
  };
}

export function decryptValue(value: EncryptedValue, secret: string): Buffer {
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    encryptionKey(secret),
    Buffer.from(value.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(value.tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(value.data, "base64")), decipher.final()]);
}

export function readCertificate(pfx: Buffer, password: string): CertificateMaterial {
  const asn1 = forge.asn1.fromDer(pfx.toString("binary"));
  const pkcs12 = forge.pkcs12.pkcs12FromAsn1(asn1, password);
  const certBag = pkcs12.getBags({bagType: forge.pki.oids.certBag})[forge.pki.oids.certBag]?.[0];
  const keyBag = pkcs12.getBags({bagType: forge.pki.oids.pkcs8ShroudedKeyBag})[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0];
  if (!certBag?.cert || !keyBag?.key) throw new Error("Certificado ou chave privada nao encontrados no arquivo A1.");

  const now = new Date();
  if (now < certBag.cert.validity.notBefore || now > certBag.cert.validity.notAfter) {
    throw new Error("Certificado digital fora do periodo de validade.");
  }

  const subject = String(certBag.cert.subject.getField("CN")?.value || "Certificado A1");
  const document = subject.match(/\d{14}/)?.[0] || subject.match(/\d{11}/)?.[0];

  return {
    certificatePem: forge.pki.certificateToPem(certBag.cert),
    privateKeyPem: forge.pki.privateKeyToPem(keyBag.key),
    expiresAt: certBag.cert.validity.notAfter,
    subject,
    document,
  };
}
