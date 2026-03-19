import { useEffect, useRef } from "react";

export type TermMouseEvent = {
  x: number;    // 1-based column
  y: number;    // 1-based row
  button: number; // 0=left, 1=middle, 2=right, 64=scroll-up, 65=scroll-down
};

/**
 * Enables SGR mouse tracking and calls `handler` on every mouse press/scroll.
 * The effect runs once on mount and cleans up on unmount.
 */
export function useMouseInput(handler: (event: TermMouseEvent) => void): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    // Enable mouse button tracking + SGR extended coordinates
    process.stdout.write("\x1b[?1000h\x1b[?1006h");

    function onData(data: Buffer) {
      const str = data.toString("binary");
      // SGR format: ESC [ < Pb ; Px ; Py M (press) or m (release)
      const re = /\x1b\[<(\d+);(\d+);(\d+)([Mm])/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(str)) !== null) {
        const button = parseInt(m[1]);
        const x = parseInt(m[2]);
        const y = parseInt(m[3]);
        const isPress = m[4] === "M";
        if (isPress) {
          handlerRef.current({ x, y, button });
        }
      }
    }

    process.stdin.on("data", onData);

    return () => {
      process.stdout.write("\x1b[?1000l\x1b[?1006l");
      process.stdin.off("data", onData);
    };
  }, []);
}
