import 'dotenv/config';
import { PrismaClient } from "../../src/generated/prisma/client";
import { PrismaPg } from '@prisma/adapter-pg';
import Encrypt from "../../src/core/providers/Encrypt";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

export async function seedAdmin() {
    const admin = [
        // { // Login de admin para o local do Rodrigo
        //     name: 'rodrigo da silva',
        //     email: 'rodrigo.bs.548@gmail.com',
        //     password: 'S&nh@D&Admin692178'
        // },
        {
            name: 'diego kelme superadmin',
            email: 'kelme.dev@pm.me',
            password: 'Vamos@Inovar@26'
        },
    ]

    async function deleteOldAdmins(admins) {
        // Buscar todos os admins do banco
        const allAdmins = await prisma.admin.findMany();
        
        // Emails permitidos na seed
        const allowedEmails = admins.map(a => a.email);
        
        // Admins a serem deletados (que não estão na lista)
        const adminsToDelete = allAdmins.filter(admin => !allowedEmails.includes(admin.email));
        
        let deletados = 0;
        
        for (const admin of adminsToDelete) {
            await prisma.$transaction(async (tx) => {
                // Deletar credenciais primeiro (chave estrangeira)
                await tx.adminCredential.deleteMany({
                    where: {
                        admin_id: admin.id
                    }
                });
                
                // Depois deletar o admin
                await tx.admin.delete({
                    where: {
                        id: admin.id
                    }
                });
            });
            
            deletados++;
            console.log(`Admin deletado: ${admin.email}`);
        }
        
        return deletados;
    }

    async function createAdmin(admins) {
        let inseridos = 0;
        let atualizados = 0;

        for (const admin of admins) {
            const adminExists = await prisma.admin.findUnique({
                where: {
                    email: admin.email
                }
            })

            if (adminExists) {
                // Atualizar admin existente (sobrescrever dados)
                await prisma.$transaction(async (tx) => {
                    // Atualizar informações do admin
                    await tx.admin.update({
                        where: {
                            id: adminExists.id
                        },
                        data: {
                            name: admin.name,
                            email: admin.email,
                        }
                    });
    
                    const { hash, salt } = Encrypt.encrypt(admin.password);
    
                    // Atualizar ou criar credenciais
                    await tx.adminCredential.upsert({
                        where: {
                            admin_id: adminExists.id
                        },
                        update: {
                            hash,
                            salt,
                        },
                        create: {
                            hash,
                            salt,
                            admin_id: adminExists.id
                        }
                    });
                });

                atualizados++;
            } else {
                // Criar novo admin
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
        
        return { inseridos, atualizados };
    }

    // Primeiro deletar admins antigos que não estão na lista
    const deletados = await deleteOldAdmins(admin);

    // Depois criar/atualizar os admins da lista
    const resultado = await createAdmin(admin);

    console.log(`\n----------------------------------------------------------------------------------\n`);
    console.log(`Admins deletados: ${deletados}, inseridos: ${resultado.inseridos}, atualizados: ${resultado.atualizados}`);
    console.log(`\n----------------------------------------------------------------------------------\n`);
}