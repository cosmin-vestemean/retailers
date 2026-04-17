export const cccaperakPath = 'CCCAPERAK'

export const cccaperakMethods = ['find', 'create']

export const cccaperakClient = (client) => {
  const connection = client.get('connection')

  client.use(cccaperakPath, connection.service(cccaperakPath), {
    methods: cccaperakMethods
  })
}
