import { getServiceGraph } from '../../models/contracts.js';
import { queryContextInputParser } from '../../models/utils.js';
import { passInputTo, t } from './trpc.js';

export default t.router({
  getServiceGraph: t.procedure
    .input(queryContextInputParser)
    .query(passInputTo(getServiceGraph)),
});
