import Image from "next/image";
import { cn } from "@/components/ui/cn";
import type React from "react";

export type JittoSize = "sm" | "md" | "lg";

export type JittoPose = "main" | "tool-belt" | "search" | "graph" | "sad";

const POSE_SRC: Record<JittoPose, string> = {
  main: "/characters/jitto-main.png",
  "tool-belt": "/characters/jitto-tools.png",
  // These assets can be added later without changing code:
  search: "/characters/jitto-search.png",
  graph: "/characters/jitto-graph.png",
  sad: "/characters/jitto-sad.png",
};

const POSE_ALT: Record<JittoPose, string> = {
  main: "지또(메인 포즈)",
  "tool-belt": "지또(도구 벨트 포즈)",
  search: "지또(검색 포즈)",
  graph: "지또(그래프 포즈)",
  sad: "지또(슬픈 포즈)",
};

const POSE_BADGE: Record<JittoPose, string> = {
  main: "지또가 도와줄게요",
  "tool-belt": "추천 워크플로우 도와줄게요",
  search: "찾아볼까요?",
  graph: "데이터로 정리해볼게요",
  sad: "잠시 쉬어가요",
};

function dims(size: JittoSize) {
  if (size === "sm") return 120;
  if (size === "lg") return 220;
  return 170;
}

export function JittoPoseImage({
  pose,
  size = "md",
  className,
  badge = true,
  message,
}: {
  pose: JittoPose;
  size?: JittoSize;
  className?: string;
  badge?: boolean;
  message?: string;
}) {
  // If a pose image isn't present yet, Next/Image will error at runtime.
  // We intentionally fall back to `main` so the app stays stable until assets are added.
  const src = pose === "main" || pose === "tool-belt" ? POSE_SRC[pose] : POSE_SRC.main;
  const alt = pose === "main" || pose === "tool-belt" ? POSE_ALT[pose] : POSE_ALT.main;

  const px = dims(size);

  return (
    <div className={cn("relative mx-auto w-fit", className)} aria-label="AIXIT 워크플로우 도우미, 지또">
      <div className="relative">
        <div className="pointer-events-none absolute -inset-6 -z-10 rounded-full bg-gradient-to-b from-zinc-100 to-transparent blur-2xl" />

        <Image
          src={src}
          alt={alt}
          width={px}
          height={px}
          priority={pose === "main"}
          className={cn(
            "select-none drop-shadow-sm",
            "h-[120px] w-[120px] sm:h-[150px] sm:w-[150px] md:h-[170px] md:w-[170px]",
          )}
        />

        {badge ? (
          <div className="pointer-events-none absolute -bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-zinc-700 shadow-sm ring-1 ring-zinc-200 backdrop-blur">
            {message ?? POSE_BADGE[pose]}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function JittoMainPose(props: Omit<React.ComponentProps<typeof JittoPoseImage>, "pose">) {
  return <JittoPoseImage pose="main" {...props} />;
}

export function JittoToolBeltPose(props: Omit<React.ComponentProps<typeof JittoPoseImage>, "pose">) {
  return <JittoPoseImage pose="tool-belt" {...props} />;
}

export function JittoSearchPose(props: Omit<React.ComponentProps<typeof JittoPoseImage>, "pose">) {
  return <JittoPoseImage pose="search" {...props} />;
}

export function JittoGraphPose(props: Omit<React.ComponentProps<typeof JittoPoseImage>, "pose">) {
  return <JittoPoseImage pose="graph" {...props} />;
}

export function JittoSadPose(props: Omit<React.ComponentProps<typeof JittoPoseImage>, "pose">) {
  return <JittoPoseImage pose="sad" {...props} />;
}

