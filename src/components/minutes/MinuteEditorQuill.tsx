"use client";

import { useEffect, useState, forwardRef, useImperativeHandle } from "react";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";

const FONT_SIZES = ["10px", "12px", "14px", "16px", "18px", "20px", "24px", "28px"];
const LINE_HEIGHTS = ["1.0", "1.2", "1.5", "1.8", "2.0", "2.5", "3.0"];

let isQuillConfigured = false;

const quillModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    [{ size: FONT_SIZES }],
    [{ lineHeight: LINE_HEIGHTS }],
    ["bold", "italic", "underline", "strike"],
    [{ color: [] }, { background: [] }],
    ["link", "image"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["clean"],
  ],
};

interface Props {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}

export default function MinuteEditorQuill({ value, onChange, placeholder, className }: Props) {
  const [ready, setReady] = useState(isQuillConfigured);

  useEffect(() => {
    if (isQuillConfigured) return;

    // ReactQuill.Quill 로 접근하여 포맷 등록
    const Quill = ReactQuill.Quill;
    if (Quill) {
      const Parchment = Quill.import("parchment") as any;

      const LineHeightStyle = new Parchment.Attributor.Style("lineHeight", "line-height", {
        scope: Parchment.Scope.BLOCK,
        whitelist: LINE_HEIGHTS,
      });
      Quill.register(LineHeightStyle, true);

      const SizeStyle = new Parchment.Attributor.Style("size", "font-size", {
        scope: Parchment.Scope.INLINE,
        whitelist: FONT_SIZES,
      });
      Quill.register(SizeStyle, true);

      isQuillConfigured = true;
      setReady(true);
    }
  }, []);

  if (!ready) return <div className="p-4 text-sm text-zinc-400">에디터를 불러오는 중...</div>;

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        .ql-snow .ql-picker.ql-lineHeight .ql-picker-label::before,
        .ql-snow .ql-picker.ql-lineHeight .ql-picker-item::before {
          content: attr(data-value);
        }
        .ql-snow .ql-picker.ql-lineHeight .ql-picker-label:not([data-value])::before,
        .ql-snow .ql-picker.ql-lineHeight .ql-picker-item:not([data-value])::before {
          content: '줄간격';
        }
        .ql-snow .ql-picker.ql-lineHeight {
          width: 70px;
        }

        .ql-snow .ql-picker.ql-size .ql-picker-label::before,
        .ql-snow .ql-picker.ql-size .ql-picker-item::before {
          content: attr(data-value);
        }
        .ql-snow .ql-picker.ql-size .ql-picker-label:not([data-value])::before,
        .ql-snow .ql-picker.ql-size .ql-picker-item:not([data-value])::before {
          content: '글자 크기';
        }
      `}} />
      <ReactQuill
        theme="snow"
        value={value}
        onChange={onChange}
        modules={quillModules}
        className={className}
        placeholder={placeholder}
      />
    </>
  );
}
