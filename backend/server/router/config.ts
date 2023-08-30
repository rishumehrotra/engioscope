import {
  updateProjectConfig,
  updateProjectConfigInputParser,
} from '../../models/config.js';
import { t, passInputTo } from './trpc.js';

export default t.router({
  updateProjectConfig: t.procedure
    .input(updateProjectConfigInputParser)
    .mutation(passInputTo(updateProjectConfig)),
});
