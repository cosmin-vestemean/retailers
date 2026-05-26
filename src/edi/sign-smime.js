import forge from 'node-forge'

/**
 * S/MIME detached PKCS#7 signing, required by Infinite Edinet for invoices.
 *
 * Reads PKCS#12 keystore from env vars:
 *   EDINET_P12_BASE64   - base64-encoded .p12 file contents
 *   EDINET_P12_PASSWORD - keystore password
 *
 * Output is a multipart/signed S/MIME envelope (header + base64 PKCS#7 block).
 */

function loadKeystore() {
  const b64 = process.env.EDINET_P12_BASE64
  const pwd = process.env.EDINET_P12_PASSWORD
  if (!b64 || !pwd) {
    throw new Error('EDINET_P12_BASE64 and EDINET_P12_PASSWORD must be set to sign Infinite invoices')
  }
  const der = Buffer.from(b64, 'base64').toString('binary')
  const asn1 = forge.asn1.fromDer(der)
  const p12 = forge.pkcs12.pkcs12FromAsn1(asn1, false, pwd)

  let cert = null
  let key = null
  for (const safeContent of p12.safeContents) {
    for (const safeBag of safeContent.safeBags) {
      if (safeBag.cert && !cert) cert = safeBag.cert
      if (safeBag.key && !key) key = safeBag.key
      if (!key && safeBag.asn1 && safeBag.type === forge.pki.oids.pkcs8ShroudedKeyBag) {
        key = safeBag.key
      }
    }
  }
  if (!cert || !key) throw new Error('Edinet PKCS#12 keystore missing certificate or private key')
  return { cert, key }
}

/**
 * Sign a payload (XML string) and return an S/MIME multipart/signed envelope
 * suitable for upload to Infinite's /invoice/ FTP directory.
 *
 * @param {string} payload - The raw XML invoice
 * @returns {string} S/MIME multipart/signed message
 */
export function signSmime(payload) {
  const { cert, key } = loadKeystore()

  const p7 = forge.pkcs7.createSignedData()
  p7.content = forge.util.createBuffer(payload, 'utf8')
  p7.addCertificate(cert)
  p7.addSigner({
    key,
    certificate: cert,
    digestAlgorithm: forge.pki.oids.sha256,
    authenticatedAttributes: [
      { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
      { type: forge.pki.oids.messageDigest },
      { type: forge.pki.oids.signingTime, value: new Date() }
    ]
  })
  p7.sign({ detached: true })

  const signatureDer = forge.asn1.toDer(p7.toAsn1()).getBytes()
  const signatureB64 = forge.util.encode64(signatureDer)

  const boundary = '----edinet-boundary-' + Date.now().toString(36)
  const CRLF = '\r\n'

  return [
    `Content-Type: multipart/signed; protocol="application/pkcs7-signature"; micalg=sha-256; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: application/xml; charset=utf-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    payload,
    `--${boundary}`,
    'Content-Type: application/pkcs7-signature; name="smime.p7s"',
    'Content-Transfer-Encoding: base64',
    'Content-Disposition: attachment; filename="smime.p7s"',
    '',
    signatureB64.match(/.{1,64}/g).join(CRLF),
    `--${boundary}--`,
    ''
  ].join(CRLF)
}
