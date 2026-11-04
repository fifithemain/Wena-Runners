import Image from "next/image";

type CategoryArtKind = "pickup" | "groceries" | "documents" | "home" | "other";

const categoryAssets: Record<CategoryArtKind, string> = {
  pickup: "/assets/category-pickups.svg",
  groceries: "/assets/category-groceries.svg",
  documents: "/assets/category-documents.svg",
  home: "/assets/category-home-help.svg",
  other: "/assets/category-something-else.svg",
};

export function RunnerScene() {
  return (
    <Image
      className="runner-scene"
      src="/assets/runner-neighbourhood.svg"
      width={760}
      height={520}
      alt="Illustration of a local Runner carrying groceries through a sunny neighbourhood"
      priority
    />
  );
}

export function CategoryArtwork({ kind }: { kind: CategoryArtKind }) {
  return (
    <Image
      className={`category-art category-art--${kind}`}
      src={categoryAssets[kind]}
      width={120}
      height={90}
      alt=""
      aria-hidden="true"
    />
  );
}
