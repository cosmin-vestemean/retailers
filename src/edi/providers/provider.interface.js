/**
 * EDI provider contract. Encapsulates protocol-specific knowledge:
 * remote directory layout, file naming conventions, XML schema parsing.
 *
 * @typedef {Object} ParsedOrder
 * @property {string}  orderId        - Buyer order number (e.g. "01038016")
 * @property {string=} buyerGln       - GLN of the buyer / ordering party
 * @property {string=} shipToGln      - GLN of the delivery location, if any
 * @property {string}  documentType   - 'order' | 'retann'
 * @property {object}  raw            - The parsed JSON tree (xml2js explicitArray:false)
 *
 * @typedef {Object} ParsedRecadv
 * @property {string}   documentNumber   - RecadvHeader/DocumentNumber (Edinet internal id)
 * @property {string=}  buyerGln         - RecadvParty/BuyerParty/GLN
 * @property {number=}  trdr             - Resolved retailer TRDR, from buyerGln
 * @property {string[]} orders           - BuyerOrderNumber, split on comma/semicolon
 * @property {string}   adviceRaw        - RecadvHeader/DeliveryDocumentNumber, verbatim (Auchan: empty)
 * @property {string[]} adviceSuffixes   - Numeric tail(s) of adviceRaw, zero-padded to 6 digits
 * @property {boolean}  adviceTruncated  - True when adviceRaw is a truncated form ("...-053657/AE")
 * @property {object[]} items            - { buyerItemId, gtin, accepted, description, isPallet }
 * @property {number}   numberOfItems    - RecadvSummary/NumberOfItems
 * @property {number}   numberOfDocuments - DocumentSummary/NumberOfDocuments
 * @property {object}   raw              - The parsed JSON tree (xml2js explicitArray:false)
 *
 * @typedef {Object} EdiProvider
 * @property {string} code                                                  // 'docprocess' | 'infinite'
 * @property {(docType: 'orders'|'retann'|'aperak', sftpRow?: object) => string[]}   filenamePrefixes
 * @property {(docType: 'orders'|'retann'|'invoice'|'aperak') => string}   remoteSubdir
 * @property {(xml: string) => Promise<ParsedOrder>}              parseOrder
 * @property {(xml: string) => Promise<object>}                   parseAperak
 * @property {(xml: string) => Promise<ParsedRecadv>=}            parseRecadv
 */
export {}
