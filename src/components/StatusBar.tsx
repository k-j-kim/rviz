import React, { useEffect, useState } from "react";
import { Box, Text } from "ink";
import { TreeMode } from "./Tree.js";

type Props = {
  copiedMessage: string | null;
  mode: TreeMode;
};

export function StatusBar({ copiedMessage, mode }: Props) {
  const [visible, setVisible] = useState<string | null>(null);

  useEffect(() => {
    if (copiedMessage) {
      setVisible(copiedMessage);
      const timer = setTimeout(() => setVisible(null), 1500);
      return () => clearTimeout(timer);
    }
  }, [copiedMessage]);

  return (
    <Box borderStyle="single" borderTop borderBottom={false} borderLeft={false} borderRight={false} paddingX={1}>
      {visible ? (
        <Text color="greenBright"> {visible}</Text>
      ) : mode === "search" ? (
        <Text dimColor>[↑↓] navigate  [enter] copy+close  [esc] cancel</Text>
      ) : (
        <Text dimColor>[↑↓] navigate  [→/enter] expand  [←] collapse  [c] copy rel  [C] copy abs  [/] search  [q] quit</Text>
      )}
    </Box>
  );
}
