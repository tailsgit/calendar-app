
import { getBusyTimes } from '../src/lib/availability';
import { addDays, startOfDay, endOfDay } from 'date-fns';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testTeamAvailability() {
    const email = 'tailsdrops123@gmail.com';
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
        console.error("User not found");
        return;
    }

    console.log(`Testing Team Availability for ${user.email} (${user.id})`);

    const start = startOfDay(new Date());
    const end = addDays(start, 5); // 5 Days

    console.log(`Fetching busy times from ${start.toISOString()} to ${end.toISOString()}...`);

    // Only testing for ONE user here as we don't have multiple real users with tokens in this dev env easily.
    // The API logic just loops this function, so testing the core function is sufficient proxy.
    const busySlots = await getBusyTimes(user.id, start, end);

    console.log(`\nFound ${busySlots.length} busy blocks.`);
    if (busySlots.length > 0) {
        // console.log(busySlots);
        console.log("Sample:", busySlots[0]);
    } else {
        console.log("User is completely free (or API failed to fetch external events).");
    }
}

testTeamAvailability()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
