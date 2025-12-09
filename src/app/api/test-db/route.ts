import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // 1. Test basic connection
        const userCount = await prisma.user.count();

        // 2. Test Account table existence (Critical for Auth)
        const accountCount = await prisma.account.count();

        return NextResponse.json({
            status: "Success",
            message: "Database is connected!",
            userCount,
            accountCount,
            env: {
                hasAuthSecret: !!process.env.AUTH_SECRET,
                hasPostgres: !!process.env.POSTGRES_PRISMA_URL
            }
        });
    } catch (error: any) {
        return NextResponse.json({
            status: "Error",
            message: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}
