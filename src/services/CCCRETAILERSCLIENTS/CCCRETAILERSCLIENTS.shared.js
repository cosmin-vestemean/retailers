export const cccretailersclientsPath = 'CCCRETAILERSCLIENTS'

export const cccretailersclientsMethods = ['find', 'get', 'create', 'patch', 'remove']

export const cccretailersclientsClient = (client) => {
  const connection = client.get('connection')

  client.use(cccretailersclientsPath, connection.service(cccretailersclientsPath), {
    methods: cccretailersclientsMethods
  })
}
