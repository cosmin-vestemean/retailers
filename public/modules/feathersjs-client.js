//const socket = io('https://retailers-ac9953f6caca.herokuapp.com')
const socket = io('https://retailers-modular-975638ebe522.herokuapp.com')
////const socket = io('www.retailers.acct.ro')
const client = feathers()
const socketClient = feathers.socketio(socket)

client.configure(socketClient)

export { client, socketClient}