import { SNSClient as SNSSDKImport } from "@aws-sdk/client-sns";
import { env } from "src/core/functions";

export const SNSClientLib = new SNSSDKImport({
    region: env('AWS_REGION'),
    credentials: {
        accessKeyId: env('AWS_ACCESS_KEY_ID'),
        secretAccessKey:  env('AWS_SECRET_ACCESS_KEY'),
    }
});