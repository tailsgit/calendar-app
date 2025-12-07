
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUserLunch() {
    const users = await prisma.user.findMany();
    console.log('Found users:', users.length);
    users.forEach(u => {
        console.log('User:', {
            id: u.id,
            name: u.name,
            email: u.email,
            lunchEnabled: u.lunchEnabled,
            lunchStart: u.lunchStart,
            lunchEnd: u.lunchEnd
        });
    });
}

checkUserLunch()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
