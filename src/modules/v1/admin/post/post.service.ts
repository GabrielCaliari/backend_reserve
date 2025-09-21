import { Injectable } from '@nestjs/common';
import APITokenRepository from 'src/core/database/repository/api-token.repository';
import { errorTypes } from 'src/core/error-types';
import { errorResponse } from 'src/core/functions';
import generateImageFX from 'src/core/providers/generate-image-fx';
import FXGoogleAPIToken from 'src/core/providers/implementations/FXGoogle.apitoken';

@Injectable()
export class PostService {
    constructor(
        private readonly apiTokenRepository: APITokenRepository,
        private readonly fxGoogleAPIToken: FXGoogleAPIToken
    ) { }

    async generateFXImage(prompt: string): Promise<{ status: number, data: any }> {
        try {
            const token = 'ya29.a0AZYkNZhY2rCbWKSTEWyc3GyhJ2k8yyimTiOD_Go1q1zrRC3p7O-K4dA357Y00lFS8SiiPMnDDONccbzFkEud4Qmey4jBsuqAABQkfinfM6XOWRC6bVsALNaX_B3cOTj6OkIl22WI013PuNp4IH77WKU22hVrcLwaHj2oBSfqZ9yHKRaW6e6rZAbGLKFSaNvNBy7mIj8FT3O_I804ev1flF1J31ap7eKyuSfLTMbKqDqsbCjjmQnkH7dljMMFqcKCE5GKpHgfckhrMs-MPk-6rX6aqiEI-C0K42ymnXpWJ0RfX-IsU5ut5QUmxukBl6UthehEr1ywImkzsG3_q1yfEU2V1LVYANRvKhTrpLelqoJR27a8RP3IA8yubeqDgRanhl264Ok4TEGTttrLOX0l57KQzSr4B-kVCQX8X8AlaCgYKAfkSARASFQHGX2Mi_2J2LNojA--RSCEZtnFMrQ0431'

            const response = await generateImageFX({
                prompt: prompt,
                imageCount: 1,
                authorization: token,
                seed: null
            });

            if (!response.imagePanels || response.imagePanels.length === 0) {
                return errorResponse(errorTypes._400.generate_post_image, 400);
            }

            return {
                status: 200,
                data: {
                    image_fx: response
                }
            }
        } catch (error) {
            console.log(error)
            return errorResponse(errorTypes._500.generate_post_image, 500, error);
        }
    }

    async createGoogleFXToken(token: string) {
        try {
            const returned = await this.fxGoogleAPIToken.create({
                acess_token: token,
                api_identifier: process.env.ID_API_GOOGLE_FX,
                id_token: `id_${token}`,
                refresh_token: `refresh_${token}`,
                salt: '',
            });

            return {
                status: 200,
                data: {
                    id: returned.id,
                }
            }
        } catch (error) {
            return errorResponse(errorTypes._500.fx_token_not_created, 500, error);
        }
    }

    async generatePost() {
        try {

        } catch (error) {
            return errorResponse(errorTypes._500.generate_post, 500, error);
        }
    }
}
