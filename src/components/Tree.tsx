import React, { useState, useMemo, useCallback } from "react";
import * as path from "path";
import { Box, Text, useInput } from "ink";
import { TreeNode } from "../lib/fs.js";
import { copyToClipboard } from "../lib/clipboard.js";
import { useMouseInput } from "../lib/mouse.js";

// ─── color by file extension ─────────────────────────────────────────────────

function fileColor(name: string): string | undefined {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  switch (ext) {
    case "ts":
    case "tsx":       return "blueBright";
    case "js":
    case "jsx":
    case "mjs":
    case "cjs":       return "yellow";
    case "json":
    case "jsonc":     return "yellowBright";
    case "md":
    case "mdx":       return "greenBright";
    case "css":
    case "scss":
    case "sass":
    case "less":      return "magenta";
    case "html":
    case "htm":       return "redBright";
    case "sh":
    case "bash":
    case "zsh":       return "green";
    case "py":        return "blue";
    case "rs":        return "red";
    case "go":        return "cyan";
    case "yaml":
    case "yml":       return "cyanBright";
    case "toml":
    case "ini":       return "yellow";
    case "svg":
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "webp":      return "magentaBright";
    case "lock":      return "gray";
    default:          return undefined;
  }
}

// ─── tree helpers ─────────────────────────────────────────────────────────────

type FlatNode = {
  node: TreeNode;
  isLast: boolean;
  parentPrefixes: string[];
};

function flattenVisible(
  nodes: TreeNode[],
  expanded: Set<string>,
  parentPrefixes: string[] = []
): FlatNode[] {
  const result: FlatNode[] = [];
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const isLast = i === nodes.length - 1;
    result.push({ node, isLast, parentPrefixes });
    if (node.isDir && expanded.has(node.path) && node.children) {
      result.push(
        ...flattenVisible(node.children, expanded, [
          ...parentPrefixes,
          isLast ? "  " : "│ ",
        ])
      );
    }
  }
  return result;
}

function flattenAll(nodes: TreeNode[]): TreeNode[] {
  const result: TreeNode[] = [];
  for (const node of nodes) {
    result.push(node);
    if (node.isDir && node.children) {
      result.push(...flattenAll(node.children));
    }
  }
  return result;
}

// ─── constants ────────────────────────────────────────────────────────────────

const STATUS_BAR_HEIGHT = 3;
const SEARCH_INPUT_HEIGHT = 1;

// ─── component ────────────────────────────────────────────────────────────────

export type TreeMode = "tree" | "search";

type Props = {
  nodes: TreeNode[];
  rootPath: string;
  onCopy: (msg: string) => void;
  onModeChange: (mode: TreeMode) => void;
};

export function Tree({ nodes, rootPath, onCopy, onModeChange }: Props) {
  const initialExpanded = useMemo(
    () => new Set(nodes.filter((n) => n.isDir).map((n) => n.path)),
    [nodes]
  );

  const [cursor, setCursor] = useState(0);
  const [expanded, setExpanded] = useState<Set<string>>(initialExpanded);
  const [mode, setMode] = useState<TreeMode>("tree");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchCursor, setSearchCursor] = useState(0);

  const termHeight = process.stdout.rows ?? 24;
  const viewHeight = Math.max(1, termHeight - STATUS_BAR_HEIGHT);

  // ── tree data ────────────────────────────────────────────────────────────
  const flat = flattenVisible(nodes, expanded);
  const scrollOffset = Math.max(
    0,
    Math.min(
      cursor - Math.floor(viewHeight / 2),
      Math.max(0, flat.length - viewHeight)
    )
  );

  // ── search data ──────────────────────────────────────────────────────────
  const allNodes = useMemo(() => flattenAll(nodes), [nodes]);
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return allNodes;
    const q = searchQuery.toLowerCase();
    return allNodes.filter((n) =>
      path.relative(rootPath, n.path).toLowerCase().includes(q)
    );
  }, [allNodes, searchQuery, rootPath]);

  const searchResultsHeight = viewHeight - SEARCH_INPUT_HEIGHT;
  const searchScrollOffset = Math.max(
    0,
    Math.min(
      searchCursor - Math.floor(searchResultsHeight / 2),
      Math.max(0, searchResults.length - searchResultsHeight)
    )
  );

  // ── mode switching ───────────────────────────────────────────────────────
  function enterSearch() {
    setMode("search");
    setSearchQuery("");
    setSearchCursor(0);
    onModeChange("search");
  }

  function exitSearch() {
    setMode("tree");
    onModeChange("tree");
  }

  function jumpToNode(nodePath: string) {
    // Collect all ancestor paths
    const ancestors = new Set<string>();
    let p = nodePath;
    while (true) {
      const parent = p.split("/").slice(0, -1).join("/");
      if (!parent || parent === p) break;
      ancestors.add(parent);
      p = parent;
    }
    // Expand ancestors, then find the cursor index in the resulting flat list
    setExpanded((prev) => {
      const next = new Set(prev);
      for (const a of ancestors) next.add(a);
      const newFlat = flattenVisible(nodes, next);
      const idx = newFlat.findIndex((f) => f.node.path === nodePath);
      if (idx >= 0) setCursor(idx);
      return next;
    });
  }

  // ── input handling ───────────────────────────────────────────────────────
  useInput((input, key) => {
    if (mode === "search") {
      if (key.escape) {
        exitSearch();
        return;
      }
      if (key.upArrow) {
        setSearchCursor((c) => Math.max(0, c - 1));
        return;
      }
      if (key.downArrow) {
        setSearchCursor((c) => Math.min(searchResults.length - 1, c + 1));
        return;
      }
      if (key.backspace || key.delete) {
        setSearchQuery((q) => q.slice(0, -1));
        setSearchCursor(0);
        return;
      }
      if (key.return) {
        const hit = searchResults[searchCursor];
        if (hit) copyToClipboard(hit.path, rootPath, "relative").then((msg) => { onCopy(msg); jumpToNode(hit.path); exitSearch(); });
        return;
      }
      if (input && !key.ctrl && !key.meta) {
        setSearchQuery((q) => q + input);
        setSearchCursor(0);
      }
      return;
    }

    // ── tree mode ──────────────────────────────────────────────────────────
    if (input === "/") {
      enterSearch();
      return;
    }
    if (key.upArrow) {
      setCursor((c) => Math.max(0, c - 1));
      return;
    }
    if (key.downArrow) {
      setCursor((c) => Math.min(flat.length - 1, c + 1));
      return;
    }

    const current = flat[cursor];
    if (!current) return;

    if (key.rightArrow || key.return) {
      if (current.node.isDir) {
        if (!expanded.has(current.node.path)) {
          setExpanded((prev) => { const next = new Set(prev); next.add(current.node.path); return next; });
        }
      } else {
        copyToClipboard(current.node.path, rootPath, "relative").then(onCopy);
      }
      return;
    }

    if (key.leftArrow) {
      if (current.node.isDir && expanded.has(current.node.path)) {
        setExpanded((prev) => { const next = new Set(prev); next.delete(current.node.path); return next; });
      } else {
        const parentPath = current.node.path.split("/").slice(0, -1).join("/");
        const parentIdx = flat.findIndex((f) => f.node.path === parentPath);
        if (parentIdx >= 0) setCursor(parentIdx);
      }
      return;
    }

    if (input === "c") {
      copyToClipboard(current.node.path, rootPath, "relative").then(onCopy);
      return;
    }
    if (input === "C") {
      copyToClipboard(current.node.path, rootPath, "absolute").then(onCopy);
      return;
    }
    if (input === "q" || (key.ctrl && input === "c")) {
      process.exit(0);
    }
  });

  // ── mouse handling ───────────────────────────────────────────────────────
  const handleMouse = useCallback(({ x: _x, y, button }: { x: number; y: number; button: number }) => {
    const SCROLL_UP = 64;
    const SCROLL_DOWN = 65;
    const LEFT_CLICK = 0;

    if (mode === "search") {
      if (button === SCROLL_UP) {
        setSearchCursor((c) => Math.max(0, c - 1));
      } else if (button === SCROLL_DOWN) {
        setSearchCursor((c) => Math.min(searchResults.length - 1, c + 1));
      } else if (button === LEFT_CLICK && y >= 2) {
        // y=1 is search input row; y>=2 are results
        const idx = searchScrollOffset + (y - 2);
        const hit = searchResults[idx];
        if (hit) {
          setSearchCursor(idx);
          copyToClipboard(hit.path, rootPath, "relative").then((msg) => { onCopy(msg); jumpToNode(hit.path); exitSearch(); });
        }
      }
      return;
    }

    // tree mode
    if (button === SCROLL_UP) {
      setCursor((c) => Math.max(0, c - 1));
    } else if (button === SCROLL_DOWN) {
      setCursor((c) => Math.min(flat.length - 1, c + 1));
    } else if (button === LEFT_CLICK) {
      const idx = scrollOffset + (y - 1);
      const item = flat[idx];
      if (!item) return;
      setCursor(idx);
      if (item.node.isDir) {
        setExpanded((prev) => {
          const next = new Set(prev);
          if (next.has(item.node.path)) next.delete(item.node.path);
          else next.add(item.node.path);
          return next;
        });
      } else {
        copyToClipboard(item.node.path, rootPath, "relative").then(onCopy);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, flat, scrollOffset, searchResults, searchScrollOffset, rootPath, onCopy]);

  useMouseInput(handleMouse);

  // ── render: search mode ──────────────────────────────────────────────────
  if (mode === "search") {
    const visibleResults = searchResults.slice(
      searchScrollOffset,
      searchScrollOffset + searchResultsHeight
    );

    return (
      <Box flexDirection="column" height={viewHeight} overflow="hidden">
        {/* search input row */}
        <Box>
          <Text color="yellow" bold>/ </Text>
          <Text>{searchQuery}</Text>
          <Text inverse> </Text>
          {searchResults.length > 0 && (
            <Text color="gray">  {searchResults.length} match{searchResults.length !== 1 ? "es" : ""}</Text>
          )}
        </Box>

        {/* results */}
        {visibleResults.map((node, idx) => {
          const absoluteIdx = searchScrollOffset + idx;
          const isSelected = absoluteIdx === searchCursor;
          const relPath = path.relative(rootPath, node.path);
          const q = searchQuery.toLowerCase();
          const lowerRel = relPath.toLowerCase();
          const matchIdx = q ? lowerRel.indexOf(q) : -1;

          const color = node.isDir ? "cyan" : fileColor(node.name);
          const suffix = node.isDir ? "/" : "";

          return (
            <Box key={node.path}>
              {isSelected ? (
                <Text backgroundColor="blue" color="white"> {relPath}{suffix} </Text>
              ) : matchIdx >= 0 ? (
                <>
                  <Text color={color}> {relPath.slice(0, matchIdx)}</Text>
                  <Text color="yellow" bold>{relPath.slice(matchIdx, matchIdx + q.length)}</Text>
                  <Text color={color}>{relPath.slice(matchIdx + q.length)}{suffix} </Text>
                </>
              ) : (
                <Text color={color}> {relPath}{suffix} </Text>
              )}
            </Box>
          );
        })}
      </Box>
    );
  }

  // ── render: tree mode ────────────────────────────────────────────────────
  const visible = flat.slice(scrollOffset, scrollOffset + viewHeight);

  return (
    <Box flexDirection="column" height={viewHeight} overflow="hidden">
      {visible.map(({ node, isLast, parentPrefixes }, idx) => {
        const absoluteIdx = scrollOffset + idx;
        const isSelected = absoluteIdx === cursor;
        const isExpanded = expanded.has(node.path);

        const linePrefix = parentPrefixes.join("") + (isLast ? "└─ " : "├─ ");
        const dirIcon = node.isDir ? (isExpanded ? "▾ " : "▸ ") : "";
        const nameSuffix = node.isDir ? "/" : "";
        const countLabel = node.isDir && !isExpanded && node.fileCount ? `  ${node.fileCount}` : "";
        const nameColor = isSelected ? "white" : node.isDir ? "cyan" : fileColor(node.name);

        return (
          <Box key={node.path}>
            <Text color="gray">{linePrefix}</Text>
            <Text
              backgroundColor={isSelected ? "blue" : undefined}
              color={nameColor}
              bold={node.isDir}
            >
              {dirIcon}{node.name}{nameSuffix}
            </Text>
            {countLabel ? <Text color="gray">{countLabel}</Text> : null}
          </Box>
        );
      })}
    </Box>
  );
}
