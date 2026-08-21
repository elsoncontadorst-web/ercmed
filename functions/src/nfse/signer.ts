/* eslint-disable max-len, require-jsdoc */
import {SignedXml} from "xml-crypto";
import {CertificateMaterial} from "./certificateVault";

function signXmlElement(xml: string, certificate: CertificateMaterial, elementName: string): string {
  const signature = new SignedXml({
    privateKey: certificate.privateKeyPem,
    publicCert: certificate.certificatePem,
    signatureAlgorithm: "http://www.w3.org/2000/09/xmldsig#rsa-sha1",
    canonicalizationAlgorithm: "http://www.w3.org/TR/2001/REC-xml-c14n-20010315",
    getKeyInfoContent: SignedXml.getKeyInfoContent,
  });

  signature.addReference({
    xpath: `//*[local-name(.)='${elementName}']`,
    transforms: [
      "http://www.w3.org/2000/09/xmldsig#enveloped-signature",
      "http://www.w3.org/TR/2001/REC-xml-c14n-20010315",
    ],
    digestAlgorithm: "http://www.w3.org/2000/09/xmldsig#sha1",
  });
  signature.computeSignature(xml, {
    location: {reference: `//*[local-name(.)='${elementName}']`, action: "after"},
  });
  return signature.getSignedXml();
}

export function signDpsXml(xml: string, certificate: CertificateMaterial): string {
  return signXmlElement(xml, certificate, "infDPS");
}

export function signNfseEventXml(xml: string, certificate: CertificateMaterial): string {
  return signXmlElement(xml, certificate, "infPedReg");
}
