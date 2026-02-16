import { ConflictException } from '@nestjs/common';

export class BlogSlugConflictException extends ConflictException {
  constructor(slug: string) {
    super(`A blog with the slug '${slug}' already exists in this tenant.`);
  }
}
