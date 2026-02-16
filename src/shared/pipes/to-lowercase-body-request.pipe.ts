import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class ToLowercaseBodyRequestPipe implements PipeTransform {
    transform(value: any, metadata: ArgumentMetadata) {
        if (typeof value !== 'object' || value === null) {
            return value;
        }

        const lowercasedValue = {};
        for (const [key, val] of Object.entries(value)) {
            if (typeof val === 'string' && key != 'password') {
                lowercasedValue[key] = val.toLowerCase();
            } else {
                lowercasedValue[key] = val;
            }
        }
        return lowercasedValue;
    }
}
