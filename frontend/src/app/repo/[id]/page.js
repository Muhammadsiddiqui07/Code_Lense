import RepoChat from "@/components/RepoChat";

export default async function RepoPage({ params }) {
  const { id } = await params;
  return <RepoChat repoId={id} />;
}
