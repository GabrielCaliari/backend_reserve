import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { errorTypes } from '@/shared/constants/error-types';
import { errorResponse } from '@/shared/helpers';

interface WordPressPost {
    id: number;
    slug: string;
    modified_gmt: string;
    meta_tag: {
        meta_description: string;
        meta_title: string;
    }
    rttpg_featured_image_url: { full: unknown[] }
    rttpg_excerpt: string;
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
    async getSitemap() {
        try {
            const response = await axios.get<string>(
                `${process.env.WORDPRESS_POST_SITEMAP}`
            );

            if (response.status != 200) {
                throw {
                    message: 'Erro ao buscar sitemap',
                    data: response.data
                };
            }

            return {
                status: 200,
                data: response.data
            };
        } catch (error: any) {
            return errorResponse(errorTypes._500.listing_posts_error, 500, error);
        }
    }

    async getPostMetadata(slug: string) {
        try {
            const response = await axios.get<WordPressPost[]>(
                `${process.env.WORDPRESS_API_URL}/posts`,
                {
                    params: {
                        slug,
                    }
                }
            );

            if (response.status != 200 || !response.data || response.data.length == 0) {
                throw {
                    message: 'Erro ao buscar posts',
                    data: response.data
                };
            }

            return {
                status: 200,
                data: {
                    slug: response.data[0].slug,
                    title: response.data[0].title.rendered,
                    description: response.data[0].rttpg_excerpt,
                    modified: response.data[0].modified_gmt,
                    image: response.data[0].rttpg_featured_image_url ? response.data[0].rttpg_featured_image_url.full[0] : '',
                },
            };
        } catch (error: any) {
            return errorResponse(errorTypes._500.listing_posts_error, 500, error);
        }
    }

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

            if (response.status != 200 || !response.data || response.data.length == 0) {
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
