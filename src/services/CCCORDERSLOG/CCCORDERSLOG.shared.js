export const cccorderslogPath = 'CCCORDERSLOG'

export const cccorderslogMethods = ['find', 'get', 'create', 'patch', 'remove']

export const cccorderslogClient = (client) => {
  const connection = client.get('connection')

  client.use(cccorderslogPath, connection.service(cccorderslogPath), {
    methods: cccorderslogMethods
  })
}
