import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class ToLowercaseQueryParamsPipe implements PipeTransform {
    transform(value: any, metadata: ArgumentMetadata) {
        if (metadata.type !== 'query' || typeof value !== 'object' || value === null) {
            return value;
        }

        const lowercasedQueryParams = {};
        for (const [key, val] of Object.entries(value)) {
            if (typeof val === 'string') {
                lowercasedQueryParams[key] = val.toLowerCase();
            } else {
                lowercasedQueryParams[key] = val;
            }
        }
        return lowercasedQueryParams;
    }
}
