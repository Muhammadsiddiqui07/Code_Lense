import { Suspense } from "react";
import RepoChat from "@/components/RepoChat";

async function RepoPageContent({ params }) {
  const { id } = await params;
  return <RepoChat repoId={id} />;
}

export default function RepoPage({ params }) {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center text-sm text-zinc-500">
          Loading repository chat...
        </div>
      }
    >
      <RepoPageContent params={params} />
    </Suspense>
  );
}
