import { Fragment } from 'react';

// Lastform.dc.html:31-37 — ink strip, chalk text, slate dot separators, the
// final message (the live lot status) picked out in cobalt.
export function AnnouncementBar({ messages }: { readonly messages: readonly string[] }) {
  const lastIndex = messages.length - 1;

  return (
    <div className="flex h-[38px] items-center justify-center gap-6 bg-ink font-mono text-meta tracking-wide text-chalk">
      {messages.map((message, index) => (
        <Fragment key={message}>
          {index > 0 ? (
            <span aria-hidden="true" className="text-slate-lift">
              ·
            </span>
          ) : null}
          <span className={index === lastIndex ? 'text-cobalt-lift' : undefined}>{message}</span>
        </Fragment>
      ))}
    </div>
  );
}
