import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { errorTypes } from 'src/core/error-types';
import { errorResponse } from 'src/core/functions';

interface WordPressPost {
    id: number;
    title: {
        rendered: string;
    };
    content: {
        rendered: string;
    };
    date: string;
    link: string;
}

@Injectable()
export class PostService {
    async getAllPosts(page: number = 1, limit: number = 10) {
        try {
            const response = await axios.get<WordPressPost[]>(
                `${process.env.WORDPRESS_API_URL}/posts`,
                {
                    params: {
                        page,
                        per_page: limit,
                    }
                }
            );

            if (response.status != 200) {
                throw {
                    message: 'Erro ao buscar posts',
                    data: response.data
                };
            }

            const totalPosts = response.headers['x-wp-total'];
            const totalPages = response.headers['x-wp-totalpages'];

            return {
                status: 200,
                data: {
                    posts: response.data,
                    pagination: {
                        total_items: parseInt(totalPosts),
                        total_pages: parseInt(totalPages),
                        current_page: page,
                        limit: limit
                    }
                }
            };
        } catch (error: any) {
            return errorResponse(errorTypes._500.listing_posts_error, 500, error);
        }
    }

    async getPostBySlug(slug: string) {
        try {
            const response = await axios.get<WordPressPost[]>(
                `${process.env.WORDPRESS_API_URL}/posts`,
                {
                    params: {
                        slug,
                    }
                }
            );

            if (response.status != 200) {
                throw {
                    message: 'Erro ao buscar post',
                    data: response.data
                };
            }

            return {
                status: 200,
                data: response.data[0]
            };
        } catch (error: any) {
            return errorResponse(errorTypes._500.listing_posts_error, 500, error);
        }
    }
}
