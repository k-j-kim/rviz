import React, { useState } from "react";
import { Box } from "ink";
import { Tree, TreeMode } from "./components/Tree.js";
import { StatusBar } from "./components/StatusBar.js";
import { TreeNode } from "./lib/fs.js";

type Props = {
  nodes: TreeNode[];
  rootPath: string;
};

export function App({ nodes, rootPath }: Props) {
  const [copiedMessage, setCopiedMessage] = useState<string | null>(null);
  const [mode, setMode] = useState<TreeMode>("tree");

  return (
    <Box flexDirection="column" height="100%">
      <Tree nodes={nodes} rootPath={rootPath} onCopy={setCopiedMessage} onModeChange={setMode} />
      <StatusBar copiedMessage={copiedMessage} mode={mode} />
    </Box>
  );
}
