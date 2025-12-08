import prisma from "@/lib/prisma";

export async function getAccessToken(userId: string) {
    const account = await prisma.account.findFirst({
        where: {
            userId,
            provider: { in: ['google-calendar', 'google'] },
        },
        orderBy: {
            provider: 'desc', // 'google-calendar' comes after 'google', so DESC picks it first
        },
    });

    if (!account) return null;

    // Check if token is expired (or close to it)
    // NextAuth stores expires_at in seconds
    const now = Math.floor(Date.now() / 1000);
    if (account.expires_at && account.expires_at > now + 60) {
        return account.access_token;
    }

    // Token expired, refresh it
    if (!account.refresh_token) {
        console.error("No refresh token available for user", userId);
        return null;
    }

    try {
        const response = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                client_id: process.env.GOOGLE_CLIENT_ID!,
                client_secret: process.env.GOOGLE_CLIENT_SECRET!,
                grant_type: "refresh_token",
                refresh_token: account.refresh_token,
            }),
        });

        const tokens = await response.json();

        if (!response.ok) throw tokens;

        // Update database with new tokens
        await prisma.account.update({
            where: { id: account.id },
            data: {
                access_token: tokens.access_token,
                expires_at: Math.floor(Date.now() / 1000 + tokens.expires_in),
                refresh_token: tokens.refresh_token ?? account.refresh_token, // Fallback to existing if not returned
            },
        });

        return tokens.access_token;
    } catch (error) {
        console.error("Error refreshing access token", error);
        return null;
    }
}

export async function getGoogleCalendarEvents(userId: string, start: Date, end: Date) {
    const accessToken = await getAccessToken(userId);
    if (!accessToken) return [];

    try {
        const params = new URLSearchParams({
            timeMin: start.toISOString(),
            timeMax: end.toISOString(),
            singleEvents: "true",
            orderBy: "startTime",
        });

        const response = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            }
        );

        if (!response.ok) {
            console.error("Failed to fetch Google Calendar events", await response.text());
            return [];
        }

        const data = await response.json();

        return (data.items || []).map((item: any) => ({
            id: item.id || Math.random().toString(),
            title: item.summary || '(No Title)',
            start: new Date(item.start.dateTime || item.start.date),
            end: new Date(item.end.dateTime || item.end.date),
            isAllDay: !item.start.dateTime,
            source: 'google',
            location: item.location,
            description: item.description,
        }));
    } catch (error) {
        console.error("Error fetching Google events", error);
        return [];
    }
}
