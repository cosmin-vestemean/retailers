// For more information about this file see https://dove.feathersjs.com/guides/cli/service.schemas.html
import { resolve } from '@feathersjs/schema'
import { Type, getValidator, querySyntax } from '@feathersjs/typebox'
import { dataValidator, queryValidator } from '../../validators.js'

// Main data model schema
export const diagnosticsSchema = Type.Object(
  {
    standardIp: Type.String(),
    fixieIp: Type.String(), 
    timestamp: Type.String(),
    environment: Type.Object({
      nodeEnv: Type.Optional(Type.String()),
      hasFixieHost: Type.Boolean(),
      fixieHostPreview: Type.String()
    })
  },
  { $id: 'Diagnostics', additionalProperties: false }
)
export const diagnosticsValidator = getValidator(diagnosticsSchema, dataValidator)
export const diagnosticsResolver = resolve({})

export const diagnosticsExternalResolver = resolve({})

// Schema for allowed query properties
export const diagnosticsQueryProperties = Type.Pick(diagnosticsSchema, [])
export const diagnosticsQuerySchema = Type.Intersect(
  [
    querySyntax(diagnosticsQueryProperties),
    // Add additional query properties here
    Type.Object({}, { additionalProperties: false })
  ],
  { additionalProperties: false }
)
export const diagnosticsQueryValidator = getValidator(diagnosticsQuerySchema, queryValidator)
export const diagnosticsQueryResolver = resolve({})
