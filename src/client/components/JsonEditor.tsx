import { useRef, useEffect, useImperativeHandle, forwardRef } from "react";
import { EditorView, keymap } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { basicSetup } from "codemirror";
import { json } from "@codemirror/lang-json";
import { indentWithTab } from "@codemirror/commands";

export interface JsonEditorRef {
  getValue: () => string;
  setValue: (value: string) => void;
}

interface JsonEditorProps {
  initialValue?: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  height?: string;
}

export const JsonEditor = forwardRef<JsonEditorRef, JsonEditorProps>(
  ({ initialValue = "", onChange, readOnly = false, height = "300px" }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);

    useImperativeHandle(ref, () => ({
      getValue: () => viewRef.current?.state.doc.toString() ?? "",
      setValue: (value: string) => {
        const view = viewRef.current;
        if (view) {
          view.dispatch({
            changes: { from: 0, to: view.state.doc.length, insert: value },
          });
        }
      },
    }));

    useEffect(() => {
      if (!containerRef.current) return;

      const extensions = [
        basicSetup,
        json(),
        keymap.of([indentWithTab]),
        EditorView.theme({
          "&": { height, border: "1px solid #d1d5db", borderRadius: "0.375rem" },
          ".cm-scroller": { overflow: "auto" },
        }),
      ];

      if (readOnly) {
        extensions.push(EditorState.readOnly.of(true));
      }

      if (onChange) {
        extensions.push(
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              onChange(update.state.doc.toString());
            }
          }),
        );
      }

      const view = new EditorView({
        state: EditorState.create({
          doc: initialValue,
          extensions,
        }),
        parent: containerRef.current,
      });

      viewRef.current = view;

      return () => {
        view.destroy();
      };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return <div ref={containerRef} />;
  },
);

JsonEditor.displayName = "JsonEditor";
