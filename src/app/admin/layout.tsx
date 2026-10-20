import type { Metadata } from "next";

/* The owner's page: out of search, and out of the sitemap. */
export const metadata: Metadata = {
  title: "Invites · Spot",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
