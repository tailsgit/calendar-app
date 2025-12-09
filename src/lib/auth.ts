import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "@/lib/prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
    adapter: PrismaAdapter(prisma),
    providers: [
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            authorization: "https://accounts.google.com/o/oauth2/v2/auth?prompt=consent&access_type=offline&response_type=code&scope=openid%20email%20profile",
            allowDangerousEmailAccountLinking: true,
        }),
        Google({
            id: "google-calendar",
            name: "Google Calendar",
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            authorization: "https://accounts.google.com/o/oauth2/v2/auth?prompt=consent&access_type=offline&response_type=code&scope=openid%20email%20profile%20https://www.googleapis.com/auth/calendar",
            allowDangerousEmailAccountLinking: true,
        }),
        MicrosoftEntraID({
            clientId: process.env.AZURE_AD_CLIENT_ID,
            clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
            // Use common v2.0 endpoint for both personal and work accounts
            issuer: "https://login.microsoftonline.com/common/v2.0",
            authorization: {
                params: {
                    scope: "openid profile email offline_access Calendars.Read",
                    prompt: "consent", // Force consent to ensure we get a Refresh Token and scopes
                },
            },
            allowDangerousEmailAccountLinking: true,
        }),
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "text" },
            },
            async authorize(credentials) {
                if (!credentials?.email) return null;
                const user = await prisma.user.findUnique({
                    where: { email: credentials.email as string },
                });
                return user; // Allow plain email login for dev/testing
            },
        }),
    ],
    callbacks: {
        async signIn({ account, profile }) {
            console.log("SignIn Callback:");
            console.log("Provider:", account?.provider);
            return true;
        },
        async session({ session, user }) {
            if (session.user) {
                session.user.id = user.id;
            }
            return session;
        },
    },

    pages: {
        signIn: '/auth/signin',
    },
    debug: true, // Enable debug logs
});

