import Image from "next/image";
import { getProblemSourceImageRoute } from "../../lib/constants";

export function ProblemSourceImage({
  problemId,
  sourceImageUrl,
  viewerId,
  viewerRole,
  alt,
  className = "",
}: {
  problemId: string;
  sourceImageUrl: string | null;
  viewerId: string;
  viewerRole: "instructor" | "student";
  alt: string;
  className?: string;
}) {
  if (!sourceImageUrl) {
    return null;
  }

  return (
    <div className={`overflow-hidden rounded-2xl border border-slate-200 bg-white ${className}`.trim()}>
      <Image
        src={getProblemSourceImageRoute(problemId, viewerId, viewerRole)}
        alt={alt}
        width={1600}
        height={1200}
        unoptimized
        className="h-auto w-full object-contain"
      />
    </div>
  );
}
