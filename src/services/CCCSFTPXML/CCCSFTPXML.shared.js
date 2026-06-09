export const cccsftpxmlPath = 'CCCSFTPXML'

export const cccsftpxmlMethods = ['find', 'create', 'patch', 'remove', 'claim', 'pending']

export const cccsftpxmlClient = (client) => {
  const connection = client.get('connection')

  client.use(cccsftpxmlPath, connection.service(cccsftpxmlPath), {
    methods: cccsftpxmlMethods
  })
}
