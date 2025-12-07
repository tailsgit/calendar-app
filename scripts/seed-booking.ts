
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedBookingPage() {
    const email = 'tailsdrops123@gmail.com';
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
        console.error("User not found");
        return;
    }

    const slug = 'chat-with-tails';

    const page = await prisma.bookingPage.upsert({
        where: { slug },
        update: { isActive: true },
        create: {
            slug,
            title: '30 Min Chat',
            description: 'Let\'s catch up!',
            duration: 30,
            userId: user.id,
            isActive: true
        }
    });

    console.log(`Created booking page: /book/${page.slug}`);
}

seedBookingPage()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
