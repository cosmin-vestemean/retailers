// For more information about this file see https://dove.feathersjs.com/guides/cli/service.schemas.html
import { resolve } from '@feathersjs/schema'
import { Type, getValidator, querySyntax } from '@feathersjs/typebox'
import { dataValidator, queryValidator } from '../../validators.js'

// Main data model schema
export const ipLoggerSchema = Type.Object(
  {
    id: Type.Number(),
    text: Type.String()
  },
  { $id: 'IpLogger', additionalProperties: false }
)
export const ipLoggerResolver = resolve({})

export const ipLoggerExternalResolver = resolve({})

// Schema for creating new entries
export const ipLoggerDataSchema = Type.Pick(ipLoggerSchema, ['text'], {
  $id: 'IpLoggerData'
})
export const ipLoggerDataValidator = getValidator(ipLoggerDataSchema, dataValidator)
export const ipLoggerDataResolver = resolve({})

// Schema for updating existing entries
export const ipLoggerPatchSchema = Type.Partial(ipLoggerSchema, {
  $id: 'IpLoggerPatch'
})
export const ipLoggerPatchValidator = getValidator(ipLoggerPatchSchema, dataValidator)
export const ipLoggerPatchResolver = resolve({})

// Schema for allowed query properties
export const ipLoggerQueryProperties = Type.Pick(ipLoggerSchema, ['id', 'text'])
export const ipLoggerQuerySchema = Type.Intersect(
  [
    querySyntax(ipLoggerQueryProperties),
    // Add additional query properties here
    Type.Object({}, { additionalProperties: false })
  ],
  { additionalProperties: false }
)
export const ipLoggerQueryValidator = getValidator(ipLoggerQuerySchema, queryValidator)
export const ipLoggerQueryResolver = resolve({})
