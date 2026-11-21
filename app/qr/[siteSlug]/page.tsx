import { QrDisplay } from "@/components/qr/qr-display";

export default async function QrDisplayPage({
  params,
}: {
  params: Promise<{ siteSlug: string }>;
}) {
  await params;
  return <QrDisplay />;
}
