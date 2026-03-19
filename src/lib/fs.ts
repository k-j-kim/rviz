import * as path from "path";
import * as fs from "fs";
import ignore, { Ignore } from "ignore";

export type TreeNode = {
  name: string;
  path: string;
  isDir: boolean;
  children?: TreeNode[];
  fileCount?: number;
};

const DEFAULT_IGNORES = [
  "node_modules",
  ".git",
  "dist",
  "build",
  "out",
  ".next",
  ".nuxt",
  "coverage",
  ".DS_Store",
  "*.lock",
  "*.log",
];

function countFiles(nodes: TreeNode[]): number {
  let count = 0;
  for (const node of nodes) {
    if (node.isDir && node.children) {
      count += countFiles(node.children);
    } else if (!node.isDir) {
      count++;
    }
  }
  return count;
}

function walkDir(dirPath: string, ig: Ignore, rootPath: string): TreeNode[] {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch {
    return [];
  }

  const nodes: TreeNode[] = [];

  for (const entry of entries) {
    const absPath = path.join(dirPath, entry.name);
    const relPath = path.relative(rootPath, absPath);

    if (ig.ignores(relPath) || ig.ignores(entry.isDirectory() ? relPath + "/" : relPath)) {
      continue;
    }

    if (entry.isDirectory()) {
      const children = walkDir(absPath, ig, rootPath);
      const fileCount = countFiles(children);
      nodes.push({
        name: entry.name,
        path: absPath,
        isDir: true,
        children,
        fileCount,
      });
    } else if (entry.isFile()) {
      nodes.push({
        name: entry.name,
        path: absPath,
        isDir: false,
      });
    }
  }

  // Sort: dirs first, then files, both alphabetically
  nodes.sort((a, b) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return nodes;
}

export function scanDir(rootPath: string): TreeNode[] {
  const ig = ignore();
  ig.add(DEFAULT_IGNORES);

  const gitignorePath = path.join(rootPath, ".gitignore");
  if (fs.existsSync(gitignorePath)) {
    const content = fs.readFileSync(gitignorePath, "utf8");
    ig.add(content);
  }

  return walkDir(rootPath, ig, rootPath);
}
