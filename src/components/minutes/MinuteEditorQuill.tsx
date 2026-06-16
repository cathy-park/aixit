"use client";

import { useEffect, useState, forwardRef, useImperativeHandle } from "react";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";

const FONT_SIZES = ["10px", "12px", "13px", "14px", "16px", "18px", "20px", "24px", "28px"];
const LINE_HEIGHTS = ["1.0", "1.2", "1.5", "1.8", "2.0", "2.5", "3.0"];

let isQuillConfigured = false;

if (typeof window !== "undefined" && ReactQuill.Quill && !isQuillConfigured) {
  const Quill = ReactQuill.Quill;
  try {
    const BlockEmbed = Quill.import('blots/block/embed') as any;
    class DividerBlot extends BlockEmbed {}
    DividerBlot.blotName = 'divider';
    DividerBlot.tagName = 'hr';
    Quill.register(DividerBlot, true);

    const Parchment = Quill.import("parchment") as any;
    const StyleAttributor = Parchment.StyleAttributor || (Parchment.Attributor && Parchment.Attributor.Style);

    if (StyleAttributor) {
      const LineHeightStyle = new StyleAttributor("lineHeight", "line-height", {
        scope: Parchment.Scope.BLOCK,
        whitelist: LINE_HEIGHTS,
      });
      Quill.register(LineHeightStyle, true);

      const SizeStyle = new StyleAttributor("size", "font-size", {
        scope: Parchment.Scope.INLINE,
        whitelist: FONT_SIZES,
      });
      Quill.register(SizeStyle, true);
    }

    const icons = Quill.import('ui/icons') as any;
    if (icons) {
      icons['divider'] = '<svg viewBox="0 0 18 18"><line class="ql-stroke" x1="3" x2="15" y1="9" y2="9" stroke="currentColor" stroke-width="2" stroke-linecap="round"></line></svg>';
    }

    isQuillConfigured = true;
  } catch (err) {
    console.error("Quill attribute registration failed", err);
  }
}

const quillModules = {
  toolbar: {
    container: [
      [{ header: [1, 2, 3, false] }],
      [{ size: FONT_SIZES }],
      [{ lineHeight: LINE_HEIGHTS }],
      ["bold", "italic", "underline", "strike"],
      [{ color: [] }, { background: [] }],
      ["link", "image", "divider", "blockquote"],
      [{ list: "ordered" }, { list: "bullet" }],
    ],
    handlers: {
      divider: function (this: any) {
        const quill = this.quill;
        const range = quill.getSelection(true);
        quill.insertText(range.index, '\n', 'user');
        quill.insertEmbed(range.index + 1, 'divider', true, 'user');
        quill.setSelection(range.index + 2, 'silent');
      }
    }
  }
};

const quillFormats = [
  "header", "size", "lineHeight",
  "bold", "italic", "underline", "strike",
  "color", "background",
  "link", "image", "divider", "blockquote",
  "list", "bullet", "indent"
];

interface Props {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}

export default function MinuteEditorQuill({ value, onChange, placeholder, className }: Props) {
  const [ready, setReady] = useState(isQuillConfigured);

  useEffect(() => {
    if (!isQuillConfigured) {
      // 혹시라도 서버사이드 렌더링 등의 이유로 아직 등록 안 된 경우를 대비
      setReady(true);
      return;
    }
    setReady(true);
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
        formats={quillFormats}
        className={className}
        placeholder={placeholder}
      />
    </>
  );
}
