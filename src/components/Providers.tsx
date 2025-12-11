"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "react-hot-toast";
import CronSimulator from "./CronSimulator";
import { ClipboardProvider } from "@/context/ClipboardContext";

export default function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <ClipboardProvider>
                {children}
                <Toaster position="bottom-right" />
                <CronSimulator />
            </ClipboardProvider>
        </SessionProvider>
    );
}
