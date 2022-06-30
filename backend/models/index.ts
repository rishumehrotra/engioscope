import { connect } from 'mongoose';
import { listConnections } from './connections';

const go = () => connect('mongodb://localhost:27017/test');

go();
listConnections().then(console.log);
