"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkEmoji from "remark-emoji";
import { config } from "@/lib/main";

interface MDHandlerProps {
  content: string;
}

export default function MDHandler({ content }: MDHandlerProps) {
  const isDark = config.theme === "dark";
  const accentColor = config.accentColor || "#00f2fe";

  const MarkdownLink = ({ href, children }: any) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{ color: accentColor }}
      className="font-bold hover:underline"
    >
      {children}
    </a>
  );

  const CodeBlock = ({ inline, className, children, ...props }: any) => {
    if (inline) {
      return (
        <code
          className={`font-mono text-xs px-1.5 py-0.5 rounded ${
            isDark ? "bg-white/10 text-cyan-300" : "bg-zinc-200 text-zinc-800"
          }`}
          {...props}
        >
          {children}
        </code>
      );
    }
    return (
      <div
        className={`my-3 overflow-x-auto rounded-xl p-4 font-mono text-xs border ${
          isDark
            ? "bg-[#07080a] border-white/10 text-zinc-200"
            : "bg-zinc-900 border-zinc-800 text-zinc-100"
        }`}
      >
        <code className={className} {...props}>
          {children}
        </code>
      </div>
    );
  };

  return (
    <div
      className={`text-sm leading-relaxed max-w-none inline-block w-full min-w-0 ${
        isDark ? "text-zinc-300" : "text-zinc-700"
      }`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkEmoji]}
        components={{
          p: ({ children }) => (
            <p className="mb-2 last:mb-0 whitespace-pre-wrap break-words [word-break:break-word] w-full max-w-full inline-block">
              {children}
            </p>
          ),
          strong: ({ children }) => (
            <strong
              className={`font-semibold ${
                isDark ? "text-zinc-100" : "text-gray-900"
              }`}
            >
              {children}
            </strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          a: MarkdownLink,
          h1: ({ children }) => (
            <h1
              className={`text-xl sm:text-2xl font-extrabold tracking-tight mt-4 mb-2 break-words ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2
              className={`text-lg sm:text-xl font-bold tracking-tight mt-4 mb-2 pb-1 border-b break-words ${
                isDark
                  ? "text-white border-white/[0.04]"
                  : "text-gray-900 border-gray-200"
              }`}
            >
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3
              className={`text-base sm:text-lg font-bold tracking-tight mt-3 mb-1 break-words ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              {children}
            </h3>
          ),
          ul: ({ children }) => (
            <ul
              className={`list-disc list-outside ml-4 mb-2 space-y-1 break-words ${
                isDark ? "marker:text-zinc-500" : "marker:text-gray-400"
              }`}
            >
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol
              className={`list-decimal list-outside ml-4 mb-2 space-y-1 break-words ${
                isDark ? "marker:text-zinc-500" : "marker:text-gray-400"
              }`}
            >
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="pl-1 break-words">{children}</li>
          ),
          blockquote: ({ children }) => (
            <blockquote
              className={`border-l-[4px] pl-3 py-[2px] not-italic my-2 shadow-sm break-words ${
                isDark
                  ? "border-zinc-600 bg-[#12141A] text-zinc-300"
                  : "border-gray-300 bg-gray-50 text-gray-600"
              }`}
            >
              {children}
            </blockquote>
          ),
          hr: () => (
            <hr
              className={`my-4 border-t-[3px] w-full rounded-full ${
                isDark ? "border-white/10" : "border-gray-300"
              }`}
            />
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto w-full my-3">
              <table className="min-w-full text-sm border-collapse">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th
              className={`text-left p-2 font-semibold border ${
                isDark
                  ? "bg-[#12141A] border-white/[0.04] text-zinc-200"
                  : "bg-gray-100 border-gray-200 text-gray-800"
              }`}
            >
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td
              className={`p-2 border ${
                isDark
                  ? "border-white/[0.04] text-zinc-300"
                  : "border-gray-200 text-gray-700"
              }`}
            >
              {children}
            </td>
          ),
          code: CodeBlock,
          pre: ({ children }: any) => <>{children}</>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}