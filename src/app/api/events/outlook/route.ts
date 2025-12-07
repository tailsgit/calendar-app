import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getOutlookCalendarEvents } from "@/lib/outlook";

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const startStr = searchParams.get('start');
    const endStr = searchParams.get('end');

    if (!startStr || !endStr) {
        return NextResponse.json({ error: "Missing start or end date" }, { status: 400 });
    }

    try {
        const events = await getOutlookCalendarEvents(
            session.user.id,
            new Date(startStr),
            new Date(endStr)
        );

        return NextResponse.json(events);
    } catch (error) {
        console.error("Error in outlook events API", error);
        return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
    }
}
