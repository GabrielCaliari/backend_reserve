import { PrismaClient } from "@prisma/client";
import Encrypt from "../../src/core/providers/Encrypt";

const prisma = new PrismaClient();

export async function seedAdmin() {
    const admin = [
        // { // Login de admin para o local do Rodrigo
        //     name: 'rodrigo da silva',
        //     email: 'rodrigo.bs.548@gmail.com',
        //     password: 'S&nh@D&Admin692178'
        // },
        {
            name: 'rodrigo da silva producao',
            email: 'rodrigo.contato.548@gmail.com',
            password: 'S&nh@D&Admin692178'
        }
    ]

    async function createAdmin(admins) {
        let inseridos = 0;
        let jaExistentes = 0;

        for (const admin of admins) {
            const adminExists = await prisma.admin.findUnique({
                where: {
                    email: admin.email
                }
            })

            if (adminExists) {
                jaExistentes++;
            } else {
                const result = await prisma.$transaction(async (tx) => {
                    const _admin = await tx.admin.create({
                        data: {
                            name: admin.name,
                            email: admin.email,
                        }
                    });
    
                    const { hash, salt } = Encrypt.encrypt(admin.password);
    
                    await tx.adminCredential.create({
                        data: {
                            hash,
                            salt,
                            admin_id: _admin.id
                        }
                    });
    
                    return _admin;
                });

                inseridos++;
            }

        }
        
        return { inseridos, jaExistentes };
    }

    const resultado = await createAdmin(admin);

    console.log(`\n----------------------------------------------------------------------------------\n`);
    console.log(`Admins inseridos: ${resultado.inseridos}, já existentes: ${resultado.jaExistentes}`);
    console.log(`\n----------------------------------------------------------------------------------\n`);
}