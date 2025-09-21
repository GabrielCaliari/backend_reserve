import RepositoryException from "src/core/exceptions/RepositoryException";
import prismaClient from "../prisma/prismaClient";

export default class ConfigRepository {
    async findAll() {
        try {
            const config = await prismaClient.config.findMany();
            return config;
        } catch (err) {
            throw new RepositoryException('Error selecting all configs', err);
        }
    }

    async findByName(name: string) {
        try {
            const config = await prismaClient.config.findUnique({
                where: { name }
            });
            return config;
        } catch (err) {
            throw new RepositoryException('Error selecting config by name', err);
        }
    }
}

