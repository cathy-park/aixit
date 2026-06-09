"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";

export function FolderSummaryEditor({
  initialSummary,
  onSave
}: {
  initialSummary?: string;
  onSave: (val: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(initialSummary || "");

  useEffect(() => {
    setValue(initialSummary || "");
  }, [initialSummary]);

  if (isEditing) {
    return (
      <textarea
        autoFocus
        className="w-full text-sm border border-zinc-200 focus:border-zinc-300 focus:bg-white rounded-lg p-2 transition resize-y min-h-[60px]"
        placeholder="이 폴더에 대한 요약이나 메모를 마크다운으로 간략히 작성해 보세요... (컬러는 <span style='color:red'> 등 HTML 태그 사용)"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => {
          setIsEditing(false);
          if (value !== initialSummary) onSave(value);
        }}
      />
    );
  }

  return (
    <div
      className="w-full text-sm bg-transparent hover:bg-white border border-transparent hover:border-zinc-200 rounded-lg p-2 transition min-h-[60px] cursor-text"
      onClick={() => setIsEditing(true)}
    >
      {value.trim() ? (
        <div className="prose prose-sm max-w-none prose-zinc [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1">
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
            {value}
          </ReactMarkdown>
        </div>
      ) : (
        <span className="text-zinc-400">이 폴더에 대한 요약이나 메모를 마크다운으로 간략히 작성해 보세요... (클릭하여 편집)</span>
      )}
    </div>
  );
}
