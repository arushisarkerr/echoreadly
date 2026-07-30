import { CollectionDetailWorkspace } from "@/features/collections";

type CollectionPageProps = {
  params: Promise<{ id: string }>;
};

export default async function CollectionDetailPage({
  params,
}: CollectionPageProps) {
  const { id } = await params;
  return <CollectionDetailWorkspace collectionId={id} />;
}
