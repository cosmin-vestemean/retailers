export const cccretailersclientsPath = 'CCCRETAILERSCLIENTS'

export const cccretailersclientsMethods = ['find']

export const cccretailersclientsClient = (client) => {
  const connection = client.get('connection')

  client.use(cccretailersclientsPath, connection.service(cccretailersclientsPath), {
    methods: cccretailersclientsMethods
  })
}
