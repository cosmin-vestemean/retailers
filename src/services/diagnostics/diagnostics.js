import { DiagnosticsService } from './diagnostics.class.js';
import { diagnosticsHooks } from './diagnostics.hooks.js';
import {
  diagnosticsValidator,
  diagnosticsResolver,
  diagnosticsExternalResolver,
  diagnosticsQueryValidator,
  diagnosticsQueryResolver
} from './diagnostics.schema.js';

export const diagnostics = (app) => {
  // Register the service
  app.use('diagnostics', new DiagnosticsService(), {
    methods: ['find'],
    validators: {
      find: diagnosticsQueryValidator
    },
    schemas: {
      result: diagnosticsResolver,
      external: diagnosticsExternalResolver,
      query: diagnosticsQueryResolver
    }
  });

  // Initialize hooks
  app.service('diagnostics').hooks(diagnosticsHooks);
};
