// // For more information about this file see https://dove.feathersjs.com/guides/cli/service.schemas.html
import { resolve } from '@feathersjs/schema'
import { Type, getValidator, querySyntax } from '@feathersjs/typebox'
import { dataValidator, queryValidator } from '../../validators.js'

// Main data model schema
export const cccxmls1MappingsSchema = Type.Object(
  {
    CCCXMLS1MAPPINGS: Type.Number(),
    XMLNODE: Type.String(),   
    MANDATORY: Type.Optional(Type.Number()),
    S1TABLE1: Type.String(),
    S1FIELD1: Type.String(),
    S1TABLE2: Type.Optional(Type.String()),
    S1FIELD2: Type.Optional(Type.String()),
    SQL: Type.Optional(Type.String()),
    OBSERVATII: Type.Optional(Type.String()),
    CCCDOCUMENTES1MAPPINGS: Type.Number(),
  },
  { $id: 'Cccxmls1Mappings', additionalProperties: false }
)
export const cccxmls1MappingsValidator = getValidator(cccxmls1MappingsSchema, dataValidator)
export const cccxmls1MappingsResolver = resolve({})

export const cccxmls1MappingsExternalResolver = resolve({})

// Schema for creating new entries
export const cccxmls1MappingsDataSchema = Type.Pick(cccxmls1MappingsSchema, ['XMLNODE', 'S1TABLE1', 'S1FIELD1', 'CCCDOCUMENTES1MAPPINGS', 'S1TABLE2', 'S1FIELD2', 'MANDATORY', 'SQL', 'OBSERVATII'], {
  $id: 'Cccxmls1MappingsData'
})
export const cccxmls1MappingsDataValidator = getValidator(cccxmls1MappingsDataSchema, dataValidator)
export const cccxmls1MappingsDataResolver = resolve({})

// Schema for updating existing entries
export const cccxmls1MappingsPatchSchema = Type.Partial(cccxmls1MappingsSchema, {
  $id: 'Cccxmls1MappingsPatch'
})
export const cccxmls1MappingsPatchValidator = getValidator(cccxmls1MappingsPatchSchema, dataValidator)
export const cccxmls1MappingsPatchResolver = resolve({})

// Schema for allowed query properties
export const cccxmls1MappingsQueryProperties = Type.Pick(cccxmls1MappingsSchema, ['CCCXMLS1MAPPINGS', 'XMLNODE', 'S1TABLE1', 'S1FIELD1', 'CCCDOCUMENTES1MAPPINGS', 'MANDATORY', 'S1TABLE2', 'S1FIELD2'])
export const cccxmls1MappingsQuerySchema = Type.Intersect(
  [
    querySyntax(cccxmls1MappingsQueryProperties),
    // Add additional query properties here
    Type.Object({
      MANDATORY: Type.Number(),
      S1TABLE1: Type.String(),
      S1FIELD1: Type.String(),
      S1TABLE2: Type.String(),
      S1FIELD2: Type.String(),
      CCCDOCUMENTES1MAPPINGS: Type.Number()
    }, { additionalProperties: false })
  ],
  { additionalProperties: false }
)
export const cccxmls1MappingsQueryValidator = getValidator(cccxmls1MappingsQuerySchema, queryValidator)
export const cccxmls1MappingsQueryResolver = resolve({})
