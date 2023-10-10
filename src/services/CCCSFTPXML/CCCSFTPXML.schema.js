// // For more information about this file see https://dove.feathersjs.com/guides/cli/service.schemas.html
import { resolve } from '@feathersjs/schema'
import { Type, getValidator, querySyntax } from '@feathersjs/typebox'
import { dataValidator, queryValidator } from '../../validators.js'

// Main data model schema
export const cccsftpxmlSchema = Type.Object(
  {
    CCCSFTPXML: Type.Number(),
    TRDR_CLIENT: Type.Number(),
    TRDR_RETAILER: Type.Number(),
    XMLDATA: Type.String(),
    JSONDATA: Type.Optional(Type.String()),
    XMLDATE: Type.String(),
    XMLSTATUS: Type.Optional(Type.String()),
    XMLERROR: Type.Optional(Type.String()),
    FINDOC: Type.Optional(Type.Number()),
    XMLFILENAME: Type.String()
  },
  { $id: 'Cccsftpxml', additionalProperties: false }
)
export const cccsftpxmlValidator = getValidator(cccsftpxmlSchema, dataValidator)
export const cccsftpxmlResolver = resolve({})

export const cccsftpxmlExternalResolver = resolve({})

// Schema for creating new entries
export const cccsftpxmlDataSchema = Type.Pick(
  cccsftpxmlSchema,
  [
    'TRDR_CLIENT',
    'TRDR_RETAILER',
    'XMLDATA',
    'JSONDATA',
    'XMLDATE',
    'XMLSTATUS',
    'XMLERROR',
    'XMLFILENAME',
    'FINDOC'
  ],
  {
    $id: 'CccsftpxmlData'
  }
)
export const cccsftpxmlDataValidator = getValidator(cccsftpxmlDataSchema, dataValidator)
export const cccsftpxmlDataResolver = resolve({})

// Schema for updating existing entries
/* export const cccsftpxmlPatchSchema = Type.Partial(cccsftpxmlSchema, {
  $id: 'CccsftpxmlPatch'
}) */

export const cccsftpxmlPatchSchema = Type.Intersect(
  [
    Type.Partial(cccsftpxmlSchema, {
      $id: 'CccsftpxmlPatch'
    }),
    Type.Object(
      {
        FINDOC: Type.Number(),
        XMLFILENAME: Type.String(),
        XMLDATE: Type.String(),
        TRDR_RETAILER: Type.Number(),
      },
      { additionalProperties: false }
    )
  ],
  { additionalProperties: false }
)

export const cccsftpxmlPatchValidator = getValidator(cccsftpxmlPatchSchema, dataValidator)
export const cccsftpxmlPatchResolver = resolve({})

// Schema for allowed query properties
export const cccsftpxmlQueryProperties = Type.Pick(cccsftpxmlSchema, [
  'CCCSFTPXML',
  'TRDR_CLIENT',
  'TRDR_RETAILER',
  'XMLDATA',
  'JSONDATA',
  'XMLDATE',
  'XMLSTATUS',
  'XMLERROR',
  'XMLFILENAME',
  'FINDOC'
])
export const cccsftpxmlQuerySchema = Type.Intersect(
  [
    querySyntax(cccsftpxmlQueryProperties),
    // Add additional query properties here
    Type.Object({}, { additionalProperties: false })
  ],
  { additionalProperties: false }
)
export const cccsftpxmlQueryValidator = getValidator(cccsftpxmlQuerySchema, queryValidator)
export const cccsftpxmlQueryResolver = resolve({})
