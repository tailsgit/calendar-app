"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "react-hot-toast";
import CronSimulator from "./CronSimulator";

export default function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            {children}
            <Toaster position="bottom-right" />
            <CronSimulator />
        </SessionProvider>
    );
}
