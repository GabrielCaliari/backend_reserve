import { SNSClient as SNSSDKImport } from '@aws-sdk/client-sns';
import { env } from '@/shared/helpers/env.helper';

let snsClientInstance: SNSSDKImport | null = null;

export const SNSClientLib = {
  get client() {
    if (!snsClientInstance) {
      snsClientInstance = new SNSSDKImport({
        region: env('AWS_REGION'),
        credentials: {
          accessKeyId: env('AWS_ACCESS_KEY_ID'),
          secretAccessKey: env('AWS_SECRET_ACCESS_KEY'),
        },
      });
    }
    return snsClientInstance;
  },
};
