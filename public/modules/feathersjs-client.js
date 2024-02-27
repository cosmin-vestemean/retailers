import io from 'socket.io-client'
import { feathers } from '@feathersjs/feathers'


const socket = io('www.retailers.acct.ro');
const client = feathers();
const socketClient = feathers.socketio(socket);

client.configure(socketClient);
export { client, socketClient}