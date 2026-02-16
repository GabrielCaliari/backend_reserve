import { createAzure, type AzureOpenAIProvider } from '@ai-sdk/azure';
import { env } from 'src/core/functions';

let azureInstance: AzureOpenAIProvider | null = null;

function getAzureInstance(): AzureOpenAIProvider {
  if (!azureInstance) {
    azureInstance = createAzure({
      resourceName: env('AZURE_RESOURCE_NAME'), // Azure resource name
      apiKey: env('AZURE_API_KEY'),
    });
  }
  return azureInstance;
}

export function azure(model: string): ReturnType<AzureOpenAIProvider> {
  return getAzureInstance()(model);
}