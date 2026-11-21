import { QrDisplay } from "@/components/qr/qr-display";

export function generateStaticParams() {
  // Production static export only builds this placeholder. Nginx rewrites
  // /qr/<any-slug>/ → /qr/-/index.html; the client reads the real slug from the URL.
  return [{ siteSlug: "-" }];
}

export default async function QrDisplayPage({
  params,
}: {
  params: Promise<{ siteSlug: string }>;
}) {
  // Await params so next/dev and static export both accept the dynamic segment.
  await params;
  return <QrDisplay />;
}
