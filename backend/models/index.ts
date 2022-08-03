import { connect } from 'mongoose';
import { listConnections } from './connections.js';

const go = () => connect('mongodb://localhost:27017/test');

go();
listConnections().then(x => {
  console.log(x);
});

