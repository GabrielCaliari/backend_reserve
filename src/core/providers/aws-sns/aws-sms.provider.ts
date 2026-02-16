import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';
import { SNSClientLib } from './sns.lib';
import ProviderException from 'src/core/exceptions/ProviderException';
import { PROVIDER_AWS_SMS_ERROR } from 'src/core/constants';

export default class AWSSMSProvider {
    private get snsClient(): SNSClient {
        return SNSClientLib.client;
    }

    async execute({ phone_number, message }) {
        try {
            const params = {
                Message: message,
                PhoneNumber: phone_number,
                MessageAttributes: {
                    'AWS.SNS.SMS.SMSType': {
                        DataType: 'String',
                        StringValue: 'Transactional',
                    },
                },
            }

            const smsResponse = await this.snsClient.send(new PublishCommand(params))

            return smsResponse;
        } catch (err) {
            throw new ProviderException(PROVIDER_AWS_SMS_ERROR, err);
        }
    }
}