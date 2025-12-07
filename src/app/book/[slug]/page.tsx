
import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import PublicBookingClient from '@/components/booking/PublicBookingClient';
import { Metadata } from 'next';

interface PageProps {
    params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params;
    const page = await prisma.bookingPage.findUnique({
        where: { slug },
        select: { title: true, user: { select: { name: true } } }
    });

    if (!page) return { title: 'Not Found' };

    return {
        title: `${page.title} | ${page.user.name}`,
    };
}

export default async function BookingPage({ params }: PageProps) {
    const { slug } = await params;

    const bookingPage = await prisma.bookingPage.findUnique({
        where: { slug, isActive: true },
        include: {
            user: {
                select: {
                    name: true,
                    image: true,
                    email: true,
                    timeZone: true
                }
            }
        }
    });

    if (!bookingPage) {
        notFound();
    }

    // JSON-serializable data for client component
    const pageData = {
        id: bookingPage.id,
        title: bookingPage.title,
        description: bookingPage.description,
        duration: bookingPage.duration,
        slug: bookingPage.slug,
        owner: {
            name: bookingPage.user.name,
            image: bookingPage.user.image,
            timeZone: bookingPage.user.timeZone
        }
    };

    return (
        <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
            <div className="max-w-4xl w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-neutral-100">
                <PublicBookingClient page={pageData} />
            </div>
        </div>
    );
}
