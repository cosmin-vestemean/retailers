// // For more information about this file see https://dove.feathersjs.com/guides/cli/service.schemas.html
import { resolve } from '@feathersjs/schema'
import { Type, getValidator, querySyntax } from '@feathersjs/typebox'
import { dataValidator, queryValidator } from '../../validators.js'

// Main data model schema
export const cccsftpSchema = Type.Object(
  {
    CCCSFTP: Type.Number(),
    TRDR_RETAILER: Type.Number(),
    URL: Type.String(),
    USERNAME: Type.String(),
    PASSPHRASE: Type.String(),
    INITIALDIR: Type.String(),
    FINGERPRINT: Type.String(),
    PRIVATEKEY: Type.String(),
    EDIPROVIDER: Type.Number(),
  },
  { $id: 'CCCSFTP', additionalProperties: false }
)
export const cccsftpValidator = getValidator(cccsftpSchema, dataValidator)
export const cccsftpResolver = resolve({})

export const cccsftpExternalResolver = resolve({})

// Schema for creating new entries
export const cccsftpDataSchema = Type.Pick(
  cccsftpSchema,
  ['TRDR_RETAILER', 'URL', 'USERNAME', 'PASSPHRASE', 'INITIALDIR', 'FINGERPRINT', 'PRIVATEKEY', 'EDIPROVIDER'],
  {
    $id: 'CccsftpData'
  }
)
export const cccsftpDataValidator = getValidator(cccsftpDataSchema, dataValidator)
export const cccsftpDataResolver = resolve({})

// Schema for updating existing entries
export const cccsftpPatchSchema = Type.Partial(cccsftpSchema, {
  $id: 'CccsftpPatch'
})
export const cccsftpPatchValidator = getValidator(cccsftpPatchSchema, dataValidator)
export const cccsftpPatchResolver = resolve({})

// Schema for allowed query properties
export const cccsftpQueryProperties = Type.Pick(cccsftpSchema, [
  'CCCSFTP',
  'TRDR_RETAILER',
  'URL',
  'USERNAME',
  'PASSPHRASE',
  'INITIALDIR',
  'FINGERPRINT',
  'PRIVATEKEY',
  'EDIPROVIDER'
])
export const cccsftpQuerySchema = Type.Intersect(
  [
    querySyntax(cccsftpQueryProperties),
    // Add additional query properties here
    Type.Object({}, { additionalProperties: false })
  ],
  { additionalProperties: false }
)
export const cccsftpQueryValidator = getValidator(cccsftpQuerySchema, queryValidator)
export const cccsftpQueryResolver = resolve({})
