
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUser() {
    const email = 'tailsdrops123@gmail.com';
    console.log(`Checking for user: ${email}`);

    const user = await prisma.user.findUnique({
        where: { email },
        include: { accounts: true }
    });

    if (!user) {
        console.log('User not found in database.');
        return;
    }

    console.log(`User found: ${user.id}`);

    const googleAccount = user.accounts.find(a => a.provider === 'google');

    if (!googleAccount) {
        console.log('No Google account linked.');
        return;
    }

    console.log('Google account found.');
    console.log('Refresh Token present:', !!googleAccount.refresh_token);
    console.log('Access Token present:', !!googleAccount.access_token);
    console.log('Scopes:', googleAccount.scope);

    // If we have tokens, let's try to fetch events
    if (googleAccount.refresh_token) {
        console.log('\n--- Attempting to fetch events ---');
        try {
            // We need to import the function we just wrote. 
            // Since this is a script, we might need to rely on relative path
            const { getGoogleCalendarEvents } = await import('../src/lib/google');

            const start = new Date('2025-12-10T00:00:00.000Z'); // Dec 10 2025
            const end = new Date('2025-12-11T00:00:00.000Z');   // Dec 11 2025 (Next day)

            console.log(`Fetching events from ${start.toISOString()} to ${end.toISOString()}...`);

            const events = await getGoogleCalendarEvents(user.id, start, end);

            console.log(`Found ${events.length} events.`);
            events.forEach((e: any) => {
                console.log(`- [${e.start.toISOString()}] ${e.title}`);
            });
        } catch (e) {
            console.error('Error fetching events:', e);
        }
    }
}

checkUser()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
