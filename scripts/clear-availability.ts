
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearAvailability() {
    // Hardcoded for the known test user
    const email = 'tailsdrops123@gmail.com';
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
        console.error("User not found");
        return;
    }

    console.log(`Clearing availability for ${user.email}...`);
    const { count } = await prisma.availability.deleteMany({
        where: { userId: user.id }
    });
    console.log(`Deleted ${count} slots.`);
}

clearAvailability()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
