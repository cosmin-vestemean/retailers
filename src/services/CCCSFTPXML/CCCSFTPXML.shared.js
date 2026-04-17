export const cccsftpxmlPath = 'CCCSFTPXML'

export const cccsftpxmlMethods = ['find', 'create', 'patch', 'remove']

export const cccsftpxmlClient = (client) => {
  const connection = client.get('connection')

  client.use(cccsftpxmlPath, connection.service(cccsftpxmlPath), {
    methods: cccsftpxmlMethods
  })
}
