const socket = io('www.retailers.acct.ro');
const client = feathers();
export const socketClient = feathers.socketio(socket);

client.configure(socketClient);
export default client;