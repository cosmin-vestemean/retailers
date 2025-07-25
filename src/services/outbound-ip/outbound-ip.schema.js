// For more information about this file see https://dove.feathersjs.com/guides/cli/service.schemas.html
import { resolve } from '@feathersjs/schema'
import { Type, getValidator, querySyntax } from '@feathersjs/typebox'
import { dataValidator, queryValidator } from '../../validators.js'

// Main data model schema
export const outboundIpSchema = Type.Object(
  {
    ip: Type.String()
  },
  { $id: 'OutboundIp', additionalProperties: false }
)
export const outboundIpResolver = resolve({})

export const outboundIpExternalResolver = resolve({})

// Schema for creating new entries
export const outboundIpDataSchema = Type.Pick(outboundIpSchema, ['ip'], {
  $id: 'OutboundIpData'
})
export const outboundIpDataValidator = getValidator(outboundIpDataSchema, dataValidator)
export const outboundIpDataResolver = resolve({})

// Schema for updating existing entries
export const outboundIpPatchSchema = Type.Partial(outboundIpSchema, {
  $id: 'OutboundIpPatch'
})
export const outboundIpPatchValidator = getValidator(outboundIpPatchSchema, dataValidator)
export const outboundIpPatchResolver = resolve({})

// Schema for allowed query properties
export const outboundIpQueryProperties = Type.Pick(outboundIpSchema, [])
export const outboundIpQuerySchema = Type.Intersect(
  [
    querySyntax(outboundIpQueryProperties),
    // Add additional query properties here
    Type.Object({}, { additionalProperties: false })
  ],
  { additionalProperties: false }
)
export const outboundIpQueryValidator = getValidator(outboundIpQuerySchema, queryValidator)
export const outboundIpQueryResolver = resolve({})
