# rviz

Terminal file tree navigator for referencing source files in Claude prompts.

Browse your project tree, find files quickly, and copy their paths to clipboard — without leaving the terminal.

![rviz demo](assets/screenshot.gif)

## Install

```bash
npm install -g rviz
```

Or clone and link locally:

```bash
git clone https://github.com/k-j-kim/rviz
cd rviz
npm install
npm run build && npm link
```

## Usage

```bash
rviz              # navigate current directory
rviz path/to/dir  # navigate a specific directory
```

## Keybindings

### Tree mode

| Key | Action |
|-----|--------|
| `↑` / `↓` | Move cursor |
| `→` / `Enter` | Expand directory |
| `←` | Collapse directory (or jump to parent) |
| `c` | Copy relative path to clipboard |
| `C` | Copy absolute path to clipboard |
| `/` | Enter search mode |
| `q` / `Ctrl+C` | Quit |

### Search mode

| Key | Action |
|-----|--------|
| type | Filter all files and directories |
| `↑` / `↓` | Navigate results |
| `Enter` | Copy path, jump to item in tree, exit search |
| `Esc` | Cancel search |

## Mouse support

- **Click** a directory — expand or collapse it
- **Click** a file — copy its relative path to clipboard
- **Scroll wheel** — move cursor up/down
- In search mode, **click** a result to copy and jump to it

## Features

- Respects `.gitignore` and ignores common directories (`node_modules`, `.git`, `dist`, etc.)
- Color-coded by file extension
- File count badges on collapsed directories
- Search across the full tree (not just visible nodes)
