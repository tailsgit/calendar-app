import prisma from "@/lib/prisma";

export async function getAccessToken(userId: string) {
    // Note: NextAuth provider ID for Microsoft Entra ID is usually 'microsoft-entra-id' or 'azure-ad'.
    // We'll check for both just in case, or stick to the one we configured.
    // Based on the import, it registers as 'microsoft-entra-id' by default in v5.
    const account = await prisma.account.findFirst({
        where: {
            userId,
            provider: 'microsoft-entra-id',
        },
    });

    if (!account) return null;

    // Check if token is expired (or close to it)
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
        // Use 'common' for the tenant to support both personal and work accounts
        const tokenEndpoint = "https://login.microsoftonline.com/common/oauth2/v2.0/token";

        const response = await fetch(tokenEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                client_id: process.env.AZURE_AD_CLIENT_ID!,
                client_secret: process.env.AZURE_AD_CLIENT_SECRET!,
                grant_type: "refresh_token",
                refresh_token: account.refresh_token,
                scope: "openid profile email offline_access Calendars.Read",
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
                refresh_token: tokens.refresh_token ?? account.refresh_token,
            },
        });

        return tokens.access_token;
    } catch (error) {
        console.error("Error refreshing Outlook access token", error);
        return null;
    }
}

export async function getOutlookCalendarEvents(userId: string, start: Date, end: Date) {
    const accessToken = await getAccessToken(userId);
    if (!accessToken) return [];

    try {
        // Graph API requires simplified ISO format or specific formatting
        const startStr = start.toISOString();
        const endStr = end.toISOString();

        const params = new URLSearchParams({
            startDateTime: startStr,
            endDateTime: endStr,
            $top: "100", // Limit to 100 events for now
            $select: "subject,start,end,location,bodyPreview,isAllDay",
        });

        const response = await fetch(
            `https://graph.microsoft.com/v1.0/me/calendarView?${params}`,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    Prefer: 'outlook.timezone="UTC"', // Standardize on UTC
                },
            }
        );

        if (!response.ok) {
            console.error("Failed to fetch Outlook Calendar events");
            console.error("Status:", response.status, response.statusText);
            console.error("Body:", await response.text());
            return [];
        }

        const data = await response.json();

        return (data.value || []).map((item: any) => ({
            id: item.id,
            title: item.subject || '(No Title)',
            start: new Date(item.start.dateTime), // Graph returns { dateTime: "...", timeZone: "..." }
            end: new Date(item.end.dateTime),
            isAllDay: item.isAllDay,
            source: 'outlook',
            location: item.location?.displayName,
            description: item.bodyPreview,
        }));
    } catch (error) {
        console.error("Error fetching Outlook events", error);
        return [];
    }
}
