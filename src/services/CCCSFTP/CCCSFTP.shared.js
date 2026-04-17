export const cccsftpPath = 'CCCSFTP'

export const cccsftpMethods = ['find', 'update', 'patch']

export const cccsftpClient = (client) => {
  const connection = client.get('connection')

  client.use(cccsftpPath, connection.service(cccsftpPath), {
    methods: cccsftpMethods
  })
}
