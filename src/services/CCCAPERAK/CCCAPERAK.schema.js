// // For more information about this file see https://dove.feathersjs.com/guides/cli/service.schemas.html
import { resolve } from '@feathersjs/schema'
import { Type, getValidator, querySyntax } from '@feathersjs/typebox'
import { dataValidator, queryValidator } from '../../validators.js'

// Main data model schema
export const cccaperakSchema = Type.Object(
  {
    CCCAPERAK: Type.Number(),
    TRDR_RETAILER: Type.Number(),
    TRDR_CLIENT: Type.Number(),
    FINDOC: Type.Number(),
    XMLFILENAME: Type.String(),
    XMLSENTDATE: Type.String(),
    MESSAGEDATE: Type.String(),
    MESSAGETIME: Type.String(),
    MESSAGEORIGIN: Type.String(),
    DOCUMENTREFERENCE: Type.String(),
    DOCUMENTUID: Type.String(),
    SUPPLIERRECEIVERCODE: Type.String(),
    DOCUMENTRESPONSE: Type.String(),
    DOCUMENTDETAIL: Type.String()
  },
  { $id: 'Cccaperak', additionalProperties: false }
)
export const cccaperakValidator = getValidator(cccaperakSchema, dataValidator)
export const cccaperakResolver = resolve({})

export const cccaperakExternalResolver = resolve({})

// Schema for creating new entries
export const cccaperakDataSchema = Type.Pick(
  cccaperakSchema,
  [
    'TRDR_RETAILER',
    'TRDR_CLIENT',
    'FINDOC',
    'XMLFILENAME',
    'XMLSENTDATE',
    'MESSAGEDATE',
    'MESSAGETIME',
    'MESSAGEORIGIN',
    'DOCUMENTREFERENCE',
    'DOCUMENTUID',
    'SUPPLIERRECEIVERCODE',
    'DOCUMENTRESPONSE',
    'DOCUMENTDETAIL'
  ],
  {
    $id: 'CccaperakData'
  }
)
export const cccaperakDataValidator = getValidator(cccaperakDataSchema, dataValidator)
export const cccaperakDataResolver = resolve({})

// Schema for updating existing entries
export const cccaperakPatchSchema = Type.Partial(cccaperakSchema, {
  $id: 'CccaperakPatch'
})
export const cccaperakPatchValidator = getValidator(cccaperakPatchSchema, dataValidator)
export const cccaperakPatchResolver = resolve({})

// Schema for allowed query properties
export const cccaperakQueryProperties = Type.Pick(cccaperakSchema, [
  'TRDR_RETAILER',
  'TRDR_CLIENT',
  'FINDOC',
  'XMLFILENAME',
  'XMLSENTDATE'
])
export const cccaperakQuerySchema = Type.Intersect(
  [
    querySyntax(cccaperakQueryProperties),
    // Add additional query properties here
    Type.Object({}, { additionalProperties: false })
  ],
  { additionalProperties: false }
)
export const cccaperakQueryValidator = getValidator(cccaperakQuerySchema, queryValidator)
export const cccaperakQueryResolver = resolve({})
