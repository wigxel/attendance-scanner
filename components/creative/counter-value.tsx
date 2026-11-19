import { range } from "effect/Array";
import type { Ref } from "react";

type CountValueProps = { index: number; ref?: Ref<HTMLDivElement> };

export function CountValue(props: CountValueProps) {
  const { index, ref } = props;

  return (
    <div
      ref={ref}
      className="flex items-start translate-y-(--y) flex-col transition duration-200 *:inline-block"
      style={{
        // The consumer only ever writes --counter-index; the offset is
        // derived here, in CSS, from the inherited font-size.
        "--counter-index": index,
        "--counter-fontSize": "1em",
        "--y": "calc(var(--counter-index, 0) * var(--counter-fontSize) * -1)",
      }}
    >
      {range(0, 9).map((e) => (
        <span
          key={e}
          className="inline-flex leading-[1em] shrink-0 h-(--counter-fontSize) border border-transparent"
        >
          {e}
        </span>
      ))}
    </div>
  );
}
