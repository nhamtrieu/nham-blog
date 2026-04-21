"use client";

import { useMemo, useRef } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { EditorSelection } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import { undo, redo } from "@codemirror/commands";
import { markdown } from "@codemirror/lang-markdown";
import { oneDark } from "@codemirror/theme-one-dark";
import {
  Bold,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListChecks,
  ListOrdered,
  MessageSquareQuote,
  Redo2,
  Table2,
  Undo2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type MdxCodeEditorProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

type SelectionMutator = (params: {
  selectedText: string;
  from: number;
  to: number;
  view: EditorView;
}) => {
  insert: string;
  selectionFrom: number;
  selectionTo: number;
};

export function MdxCodeEditor({ id, value, onChange, className }: MdxCodeEditorProps) {
  const editorViewRef = useRef<EditorView | null>(null);
  const extensions = useMemo(() => [markdown()], []);

  function updateDoc(
    view: EditorView,
    from: number,
    to: number,
    insert: string,
    selectionFrom: number,
    selectionTo: number
  ) {
    view.dispatch({
      changes: { from, to, insert },
      selection: EditorSelection.range(selectionFrom, selectionTo),
      scrollIntoView: true,
    });
    view.focus();
  }

  function withSelection(mutate: SelectionMutator) {
    const view = editorViewRef.current;

    if (!view) {
      return;
    }

    const mainSelection = view.state.selection.main;
    const selectedText = view.state.doc.sliceString(mainSelection.from, mainSelection.to);
    const next = mutate({
      selectedText,
      from: mainSelection.from,
      to: mainSelection.to,
      view,
    });

    updateDoc(
      view,
      mainSelection.from,
      mainSelection.to,
      next.insert,
      next.selectionFrom,
      next.selectionTo
    );
  }

  function wrapSelection(prefix: string, suffix: string, placeholder: string) {
    withSelection(({ selectedText, from }) => {
      const text = selectedText.length > 0 ? selectedText : placeholder;
      const insert = `${prefix}${text}${suffix}`;
      const contentStart = from + prefix.length;

      return {
        insert,
        selectionFrom: contentStart,
        selectionTo: contentStart + text.length,
      };
    });
  }

  function insertLinePrefix(prefix: string) {
    withSelection(({ selectedText, from }) => {
      const text = selectedText.length > 0 ? selectedText : "Noi dung";
      const insert = text
        .split("\n")
        .map((line) => `${prefix}${line}`)
        .join("\n");

      return {
        insert,
        selectionFrom: from,
        selectionTo: from + insert.length,
      };
    });
  }

  function insertBlock(block: string) {
    withSelection(({ selectedText, from }) => {
      const text = selectedText.length > 0 ? selectedText : block;
      const trailingLine = text.endsWith("\n") ? "" : "\n";
      const insert = `\n${text}${trailingLine}`;
      const start = from + 1;

      return {
        insert,
        selectionFrom: start,
        selectionTo: start + text.length,
      };
    });
  }

  function handleUndo() {
    const view = editorViewRef.current;
    if (view) {
      undo(view);
      view.focus();
    }
  }

  function handleRedo() {
    const view = editorViewRef.current;
    if (view) {
      redo(view);
      view.focus();
    }
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap gap-2 rounded-xl border border-border bg-muted/30 p-2">
        <Button onClick={() => wrapSelection("# ", "", "Heading 1")} size="sm" type="button" variant="outline">
          <Heading1 className="size-3.5" />
          H1
        </Button>
        <Button onClick={() => wrapSelection("## ", "", "Heading 2")} size="sm" type="button" variant="outline">
          <Heading2 className="size-3.5" />
          H2
        </Button>
        <Button onClick={() => wrapSelection("### ", "", "Heading 3")} size="sm" type="button" variant="outline">
          <Heading3 className="size-3.5" />
          H3
        </Button>
        <Button onClick={() => wrapSelection("**", "**", "Dam")} size="sm" type="button" variant="outline">
          <Bold className="size-3.5" />
          Bold
        </Button>
        <Button onClick={() => wrapSelection("*", "*", "Nghieng")} size="sm" type="button" variant="outline">
          <Italic className="size-3.5" />
          Italic
        </Button>
        <Button onClick={() => wrapSelection("`", "`", "code")} size="sm" type="button" variant="outline">
          <Code2 className="size-3.5" />
          Code
        </Button>
        <Button onClick={() => insertLinePrefix("> ")} size="sm" type="button" variant="outline">
          <MessageSquareQuote className="size-3.5" />
          Quote
        </Button>
        <Button onClick={() => insertLinePrefix("- ")} size="sm" type="button" variant="outline">
          <List className="size-3.5" />
          UL
        </Button>
        <Button onClick={() => insertLinePrefix("1. ")} size="sm" type="button" variant="outline">
          <ListOrdered className="size-3.5" />
          OL
        </Button>
        <Button onClick={() => insertLinePrefix("- [ ] ")} size="sm" type="button" variant="outline">
          <ListChecks className="size-3.5" />
          Task
        </Button>
        <Button
          onClick={() => wrapSelection("[", "](https://example.com)", "Link text")}
          size="sm"
          type="button"
          variant="outline"
        >
          <LinkIcon className="size-3.5" />
          Link
        </Button>
        <Button
          onClick={() => wrapSelection("![", "](https://images.example.com/image.jpg)", "Alt text")}
          size="sm"
          type="button"
          variant="outline"
        >
          <ImageIcon className="size-3.5" />
          Image
        </Button>
        <Button
          onClick={() => insertBlock("```mdx\n// code here\n```")}
          size="sm"
          type="button"
          variant="outline"
        >
          <Code2 className="size-3.5" />
          Block
        </Button>
        <Button
          onClick={() => insertBlock("| Cot 1 | Cot 2 |\n| --- | --- |\n| Gia tri 1 | Gia tri 2 |")}
          size="sm"
          type="button"
          variant="outline"
        >
          <Table2 className="size-3.5" />
          Table
        </Button>
        <Button onClick={handleUndo} size="sm" type="button" variant="outline">
          <Undo2 className="size-3.5" />
          Undo
        </Button>
        <Button onClick={handleRedo} size="sm" type="button" variant="outline">
          <Redo2 className="size-3.5" />
          Redo
        </Button>
      </div>

      <CodeMirror
        basicSetup={{
          foldGutter: true,
          lineNumbers: true,
          highlightActiveLine: true,
          bracketMatching: true,
          autocompletion: true,
          closeBrackets: true,
        }}
        className="overflow-hidden rounded-xl border border-input"
        extensions={extensions}
        height="24rem"
        id={id}
        onChange={onChange}
        onCreateEditor={(view) => {
          editorViewRef.current = view;
        }}
        theme={oneDark}
        value={value}
      />
    </div>
  );
}
