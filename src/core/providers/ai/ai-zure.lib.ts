import { createAzure } from '@ai-sdk/azure';
import { env } from 'src/core/functions';

export const azure = createAzure({
  resourceName: env('AZURE_RESOURCE_NAME'), // Azure resource name
  apiKey: env('AZURE_API_KEY'),
});