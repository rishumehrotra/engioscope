import { connect } from 'mongoose';
import { listConnections } from './connections.js';

await connect('mongodb://localhost:27017/test');
const conns = await listConnections();
console.log(conns);
