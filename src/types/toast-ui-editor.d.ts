// @toast-ui/editor ships real types (node_modules/@toast-ui/editor/types), but
// they aren't resolvable under "moduleResolution": "bundler" because the
// package's exports map doesn't point at them for subpath imports. This is a
// minimal hand-written declaration covering only what this app actually uses.
declare module "@toast-ui/editor" {
  export interface EditorOptions {
    el: HTMLElement;
    height?: string;
    minHeight?: string;
    initialValue?: string;
    previewStyle?: "tab" | "vertical";
    initialEditType?: "markdown" | "wysiwyg";
    placeholder?: string;
    usageStatistics?: boolean;
    toolbarItems?: string[][];
    hideModeSwitch?: boolean;
  }

  export default class Editor {
    constructor(options: EditorOptions);
    getMarkdown(): string;
    setMarkdown(markdown: string, cursorToEnd?: boolean): void;
    destroy(): void;
  }
}
