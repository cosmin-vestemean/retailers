// // For more information about this file see https://dove.feathersjs.com/guides/cli/service.schemas.html
import { resolve } from '@feathersjs/schema'
import { Type, getValidator, querySyntax } from '@feathersjs/typebox'
import { dataValidator, queryValidator } from '../../validators.js'

// Main data model schema
export const cccretailersclientsSchema = Type.Object(
  {
    CCCRETAILERSCLIENTS: Type.Number(),
    TRDR_CLIENT: Type.Number(),
    WSURL: Type.String(),
    WSUSER: Type.String(),
    WSPASS: Type.String(),
    COMPANY: Type.Optional(Type.Number()),
    BRANCH: Type.Optional(Type.Number()),
  },
  { $id: 'Cccretailersclients', additionalProperties: false }
)
export const cccretailersclientsValidator = getValidator(cccretailersclientsSchema, dataValidator)
export const cccretailersclientsResolver = resolve({})

export const cccretailersclientsExternalResolver = resolve({})

// Schema for creating new entries
export const cccretailersclientsDataSchema = Type.Pick(cccretailersclientsSchema, ['TRDR_CLIENT', 'WSURL', 'WSUSER', 'WSPASS', 'COMPANY', 'BRANCH'], {
  $id: 'CccretailersclientsData'
})
export const cccretailersclientsDataValidator = getValidator(cccretailersclientsDataSchema, dataValidator)
export const cccretailersclientsDataResolver = resolve({})

// Schema for updating existing entries
export const cccretailersclientsPatchSchema = Type.Partial(cccretailersclientsSchema, {
  $id: 'CccretailersclientsPatch'
})
export const cccretailersclientsPatchValidator = getValidator(cccretailersclientsPatchSchema, dataValidator)
export const cccretailersclientsPatchResolver = resolve({})

// Schema for allowed query properties
export const cccretailersclientsQueryProperties = Type.Pick(cccretailersclientsSchema, ['CCCRETAILERSCLIENTS', 'TRDR_CLIENT', 'WSURL', 'WSUSER', 'WSPASS', 'COMPANY', 'BRANCH'])
export const cccretailersclientsQuerySchema = Type.Intersect(
  [
    querySyntax(cccretailersclientsQueryProperties),
    // Add additional query properties here
    Type.Object({}, { additionalProperties: false })
  ],
  { additionalProperties: false }
)
export const cccretailersclientsQueryValidator = getValidator(cccretailersclientsQuerySchema, queryValidator)
export const cccretailersclientsQueryResolver = resolve({})
