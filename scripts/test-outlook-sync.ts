
import { PrismaClient } from '@prisma/client';
import { getOutlookCalendarEvents } from '../src/lib/outlook';

const prisma = new PrismaClient();

async function checkOutlookSync() {
    // You might want to change this email to the one you are testing with
    const email = 'iwase.taila@gmail.com';
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

    // Check for Microsoft provider (could be 'microsoft-entra-id' or 'azure-ad')
    const outlookAccount = user.accounts.find(a =>
        a.provider === 'microsoft-entra-id' || a.provider === 'azure-ad'
    );

    if (!outlookAccount) {
        console.log('No Outlook/Microsoft account linked.');
        console.log('Linked accounts:', user.accounts.map(a => a.provider));
        return;
    }

    console.log('Outlook account found.');
    console.log('Provider:', outlookAccount.provider);
    console.log('Refresh Token present:', !!outlookAccount.refresh_token);
    console.log('Access Token present:', !!outlookAccount.access_token);

    // Test event fetching
    if (outlookAccount.refresh_token) {
        console.log('\n--- Attempting to fetch Outlook events ---');
        try {
            const start = new Date();
            const end = new Date();
            end.setDate(end.getDate() + 30); // Next 30 days

            console.log(`Fetching events from ${start.toISOString()} to ${end.toISOString()}...`);

            const events = await getOutlookCalendarEvents(user.id, start, end);

            console.log(`Found ${events.length} events.`);
            events.forEach((e: any) => {
                console.log(`- [${e.start.toISOString()}] ${e.title} (Source: ${e.source})`);
            });
        } catch (e) {
            console.error('Error fetching events:', e);
        }
    } else {
        console.log('Cannot fetch events: No refresh token.');
    }
}

checkOutlookSync()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
