import type { ReactNode } from "react";

import "./globals.css";

export const metadata = {
  title: "Job status",
  description: "Polling UI for job-service",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="container">{children}</div>
      </body>
    </html>
  );
}
