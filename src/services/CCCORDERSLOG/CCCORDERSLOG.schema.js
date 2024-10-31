// // For more information about this file see https://dove.feathersjs.com/guides/cli/service.schemas.html
import { resolve } from '@feathersjs/schema'
import { Type, getValidator, querySyntax } from '@feathersjs/typebox'
import { dataValidator, queryValidator } from '../../validators.js'

// Main data model schema
export const cccorderslogSchema = Type.Object(
  {
    CCCORDERSLOG: Type.Number(),
    TRDR_CLIENT: Type.Number(),
    TRDR_RETAILER: Type.Number(),
    ORDERID: Type.String(),
    CCCSFTPXML: Type.Number(),
    MESSAGEDATE: Type.String(),
    MESSAGETEXT: Type.String()
  },
  { $id: 'Cccorderslog', additionalProperties: false }
)
export const cccorderslogValidator = getValidator(cccorderslogSchema, dataValidator)
export const cccorderslogResolver = resolve({})

export const cccorderslogExternalResolver = resolve({})

// Schema for creating new entries
export const cccorderslogDataSchema = Type.Pick(cccorderslogSchema, ['TRDR_CLIENT', 'TRDR_RETAILER', 'ORDERID', 'CCCSFTPXML', 'MESSAGEDATE', 'MESSAGETEXT'], {
  $id: 'CccorderslogData'
})
export const cccorderslogDataValidator = getValidator(cccorderslogDataSchema, dataValidator)
export const cccorderslogDataResolver = resolve({})

// Schema for updating existing entries
export const cccorderslogPatchSchema = Type.Partial(cccorderslogSchema, {
  $id: 'CccorderslogPatch'
})
export const cccorderslogPatchValidator = getValidator(cccorderslogPatchSchema, dataValidator)
export const cccorderslogPatchResolver = resolve({})

// Schema for allowed query properties
export const cccorderslogQueryProperties = Type.Pick(cccorderslogSchema, ['TRDR_CLIENT', 'TRDR_RETAILER', 'ORDERID', 'CCCSFTPXML', 'MESSAGEDATE', 'MESSAGETEXT'])
export const cccorderslogQuerySchema = Type.Intersect(
  [
    querySyntax(cccorderslogQueryProperties),
    // Add additional query properties here
    Type.Object({
      TRDR_CLIENT: Type.Number(),
      TRDR_RETAILER: Type.Number(),
      ORDERID: Type.String(),
      CCCSFTPXML: Type.Number(),
      MESSAGEDATE: Type.String(),
      MESSAGETEXT: Type.String()
    }, { additionalProperties: false })
  ],
  { additionalProperties: false }
)
export const cccorderslogQueryValidator = getValidator(cccorderslogQuerySchema, queryValidator)
export const cccorderslogQueryResolver = resolve({})
