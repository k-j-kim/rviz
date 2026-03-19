import * as path from "path";
import clipboard from "clipboardy";

export async function copyToClipboard(
  absolutePath: string,
  rootPath: string,
  mode: "relative" | "absolute"
): Promise<string> {
  const text = mode === "relative" ? path.relative(rootPath, absolutePath) : absolutePath;
  await clipboard.write(text);
  return text;
}
