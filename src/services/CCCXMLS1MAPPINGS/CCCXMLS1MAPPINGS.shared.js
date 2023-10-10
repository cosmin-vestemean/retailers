export const cccxmls1MappingsPath = 'CCCXMLS1MAPPINGS'

export const cccxmls1MappingsMethods = ['find', 'get', 'create', 'patch', 'remove']

export const cccxmls1MappingsClient = (client) => {
  const connection = client.get('connection')

  client.use(cccxmls1MappingsPath, connection.service(cccxmls1MappingsPath), {
    methods: cccxmls1MappingsMethods
  })
}
