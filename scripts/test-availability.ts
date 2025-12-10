
import { PrismaClient } from '@prisma/client';
import { generateAvailableSlots } from '../src/lib/availability'; // Updated import path
import { addDays, startOfDay, endOfDay } from 'date-fns';

const prisma = new PrismaClient();

async function testAvailability() {
    // 1. Setup Test User
    const email = 'tailsdrops123@gmail.com';
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
        console.error("User not found");
        return;
    }

    console.log(`Testing availability for ${user.email} (${user.id})`);

    // 2. Ensure "Working Hours" exist (9-5 Mon-Fri)
    console.log("Ensuring working hours (9-5)...");
    const weekDays = [0, 1, 2, 3, 4, 5, 6]; // All days
    // Clear existing availability
    await prisma.availability.deleteMany({
        where: { userId: user.id }
    });

    // Create default scheme
    /* 
    await prisma.availability.createMany({
        data: weekDays.map(day => ({
             userId: user.id,
             dayOfWeek: day,
             startTime: '09:00',
             endTime: '17:00',
             isEnabled: true 
        }))
    });
    */

    // 3. Define Test Range (Tomorrow)
    const tomorrow = addDays(new Date(), 1);
    const start = startOfDay(tomorrow);
    const end = endOfDay(tomorrow);

    console.log(`Checking slots for: ${start.toISOString()} to ${end.toISOString()}`);

    // 4. Generate Slots (30 min duration)
    const slots = await generateAvailableSlots(user.id, start, end, 30);

    console.log(`\nFound ${slots.length} available slots:`);
    if (slots.length > 0) {
        console.log("First 3 slots:", slots.slice(0, 3));
        console.log("Last 3 slots:", slots.slice(-3));
    } else {
        console.log("No slots found! (Are there all-day events blocking?)");
    }
}

testAvailability()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
