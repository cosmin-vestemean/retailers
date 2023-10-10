// // For more information about this file see https://dove.feathersjs.com/guides/cli/service.schemas.html
import { resolve } from '@feathersjs/schema'
import { Type, getValidator, querySyntax } from '@feathersjs/typebox'
import { dataValidator, queryValidator } from '../../validators.js'

// Main data model schema
export const cccdocumentes1MappingsSchema = Type.Object(
  {
    CCCDOCUMENTES1MAPPINGS: Type.Number(),
    TRDR_RETAILER: Type.Number(),
    TRDR_CLIENT: Type.Number(),
    SOSOURCE: Type.Number(),
    FPRMS: Type.Number(),
    SERIES: Type.Number(),
    INITIALDIRIN: Type.String(),
    INITIALDIROUT: Type.String()
  },
  { $id: 'Cccdocumentes1Mappings', additionalProperties: false }
)
export const cccdocumentes1MappingsValidator = getValidator(cccdocumentes1MappingsSchema, dataValidator)
export const cccdocumentes1MappingsResolver = resolve({})

export const cccdocumentes1MappingsExternalResolver = resolve({})

// Schema for creating new entries
export const cccdocumentes1MappingsDataSchema = Type.Pick(
  cccdocumentes1MappingsSchema,
  ['TRDR_RETAILER', 'TRDR_CLIENT', 'SOSOURCE', 'FPRMS', 'SERIES', 'INITIALDIRIN', 'INITIALDIROUT'],
  {
    $id: 'Cccdocumentes1MappingsData'
  }
)
export const cccdocumentes1MappingsDataValidator = getValidator(
  cccdocumentes1MappingsDataSchema,
  dataValidator
)
export const cccdocumentes1MappingsDataResolver = resolve({})

// Schema for updating existing entries
export const cccdocumentes1MappingsPatchSchema = Type.Partial(cccdocumentes1MappingsSchema, {
  $id: 'Cccdocumentes1MappingsPatch'
})
export const cccdocumentes1MappingsPatchValidator = getValidator(
  cccdocumentes1MappingsPatchSchema,
  dataValidator
)
export const cccdocumentes1MappingsPatchResolver = resolve({})

// Schema for allowed query properties
export const cccdocumentes1MappingsQueryProperties = Type.Pick(cccdocumentes1MappingsSchema, [
  'TRDR_RETAILER',
  'SOSOURCE',
  'FPRMS',
  'SERIES'
])
export const cccdocumentes1MappingsQuerySchema = Type.Intersect(
  [
    querySyntax(cccdocumentes1MappingsQueryProperties),
    // Add additional query properties here
    Type.Object(
      {
        TRDR_RETAILER: Type.Number(),
        SOSOURCE: Type.Number(),
        FPRMS: Type.Number(),
        SERIES: Type.Number()
      },
      { additionalProperties: false }
    )
  ],
  { additionalProperties: false }
)
export const cccdocumentes1MappingsQueryValidator = getValidator(
  cccdocumentes1MappingsQuerySchema,
  queryValidator
)
export const cccdocumentes1MappingsQueryResolver = resolve({})
