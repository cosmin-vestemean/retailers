export const cccdocumentes1MappingsPath = 'CCCDOCUMENTES1MAPPINGS'

export const cccdocumentes1MappingsMethods = ['find', 'get', 'create', 'patch', 'remove']

export const cccdocumentes1MappingsClient = (client) => {
  const connection = client.get('connection')

  client.use(cccdocumentes1MappingsPath, connection.service(cccdocumentes1MappingsPath), {
    methods: cccdocumentes1MappingsMethods
  })
}
