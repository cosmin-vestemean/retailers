const socket = io('https://retailers-ac9953f6caca.herokuapp.com')
//const socket = io('https://retailers-modular-975638ebe522.herokuapp.com')
////const socket = io('www.retailers.acct.ro')
const client = feathers()
const socketClient = feathers.socketio(socket)

client.configure(socketClient)

client.use('sftp', socketClient.service('sftp'), {
    methods: ['downloadXml', 'storeXmlInDB', 'uploadXml', 'storeAperakInErpMessages'],
    events: ['uploadResult']
  })
  
  client.use('storeXml', socketClient.service('storeXml'), {
    methods: ['find', 'get', 'create', 'update', 'patch', 'remove']
  })
  
  client.use('CCCDOCUMENTES1MAPPINGS', socketClient.service('CCCDOCUMENTES1MAPPINGS'), {
    methods: ['find', 'get', 'create', 'update', 'patch', 'remove']
  })
  
  client.use('CCCXMLS1MAPPINGS', socketClient.service('CCCXMLS1MAPPINGS'), {
    methods: ['find', 'get', 'create', 'update', 'patch', 'remove']
  })
  
  client.use('CCCRETAILERSCLIENTS', socketClient.service('CCCRETAILERSCLIENTS'), {
    methods: ['find', 'get', 'create', 'update', 'patch', 'remove']
  })
  
  client.use('connectToS1', socketClient.service('connectToS1'), {
    methods: ['find', 'get', 'create', 'update', 'patch', 'remove']
  })
  
  client.use('setDocument', socketClient.service('setDocument'), {
    methods: ['find', 'get', 'create', 'update', 'patch', 'remove']
  })
  
  client.use('getDataset', socketClient.service('getDataset'), {
    methods: ['find', 'get', 'create', 'update', 'patch', 'remove']
  })

  client.use('getDataset1', socketClient.service('getDataset1'), {
    methods: ['find', 'get', 'create', 'update', 'patch', 'remove']
  })
  
  client.use('getS1ObjData', socketClient.service('getS1ObjData'), {
    methods: ['find', 'get', 'create', 'update', 'patch', 'remove']
  })
  
  client.use('getS1SqlData', socketClient.service('getS1SqlData'), {
    methods: ['find', 'get', 'create', 'update', 'patch', 'remove']
  })
  
  //getInvoiceDom
  client.use('getInvoiceDom', socketClient.service('getInvoiceDom'), {
    methods: ['find', 'get', 'create', 'update', 'patch', 'remove']
  })

  //CCCAPERAK
  client.use('CCCAPERAK', socketClient.service('CCCAPERAK'), {
    methods: ['find', 'get', 'create', 'update', 'patch', 'remove']
  })
  
  client.service('sftp').on('uploadResult', (data) => {
    console.log('uploadResult', data)
  })

  

export default client