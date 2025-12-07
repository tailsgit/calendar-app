"use client";

import CalendarContainer from "@/components/calendar/CalendarContainer";

export default function Home() {
  return (
    <div className="home-page">
      <CalendarContainer />

      <style jsx>{`
        .home-page {
          height: 100%;
        }
      `}</style>
    </div>
  );
}
