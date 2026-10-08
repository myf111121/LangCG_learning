'use client';

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { acceptCompletion, autocompletion, completionStatus, startCompletion } from '@codemirror/autocomplete';
import { indentWithTab } from '@codemirror/commands';
import { indentUnit } from '@codemirror/language';
import { globalCompletion, localCompletionSource, python } from '@codemirror/lang-python';
import { Compartment, EditorState } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { oneDark } from '@codemirror/theme-one-dark';
import { basicSetup } from 'codemirror';
import { smartPythonCompletion } from './python-completions';

export type PythonCodeEditorHandle = {
  focus: () => void;
  selectRange: (from: number, to: number) => void;
  showCompletions: () => void;
};

type Props = {
  value: string;
  disabled?: boolean;
  maxLength?: number;
  onChange: (value: string) => void;
};

const editorTheme = EditorView.theme({
  '&': {
    height: '100%',
    backgroundColor: '#24202f',
    color: '#eeeaf5',
    fontSize: '15px',
  },
  '.cm-scroller': {
    fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", monospace',
    lineHeight: '1.7',
  },
  '.cm-content': { padding: '16px 0 48px', caretColor: '#d4ef92' },
  '.cm-line': { padding: '0 18px 0 10px' },
  '.cm-gutters': {
    backgroundColor: '#292435',
    color: '#766f85',
    borderRight: '1px solid #3b3449',
  },
  '.cm-lineNumbers .cm-gutterElement': { padding: '0 12px 0 14px' },
  '.cm-activeLine': { backgroundColor: '#ffffff08' },
  '.cm-activeLineGutter': { backgroundColor: '#373044', color: '#b8acc8' },
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection': { backgroundColor: '#6957a866 !important' },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: '#d4ef92' },
  '.cm-tooltip-autocomplete': {
    border: '1px solid #554b68',
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 16px 36px #17131f66',
  },
  '.cm-tooltip-autocomplete > ul': {
    backgroundColor: '#332d40',
    color: '#e9e3f1',
    fontFamily: '"SFMono-Regular", Consolas, monospace',
    maxHeight: '260px',
  },
  '.cm-tooltip-autocomplete > ul > li[aria-selected]': { backgroundColor: '#6f5ac6', color: '#fff' },
  '.cm-tooltip-autocomplete > ul > li': { padding: '4px 8px' },
  '.cm-completionDetail': { color: '#b9aec7', fontStyle: 'normal', marginLeft: '14px' },
  '.cm-completionInfo': {
    backgroundColor: '#2d2738',
    border: '1px solid #554b68',
    color: '#d9d1e3',
    borderRadius: '7px',
    padding: '10px 12px',
    lineHeight: '1.6',
    maxWidth: '320px',
  },
  '.cm-panels': { backgroundColor: '#2d2738', color: '#e9e3f1' },
  '.cm-searchMatch': { backgroundColor: '#d4ef9255', outline: '1px solid #d4ef9288' },
  '.cm-searchMatch.cm-searchMatch-selected': { backgroundColor: '#d4ef9288' },
  '&.cm-focused': { outline: 'none' },
  '&.cm-focused .cm-scroller': { boxShadow: 'inset 0 0 0 1px #8f7add' },
}, { dark: true });

export const PythonCodeEditor = forwardRef<PythonCodeEditorHandle, Props>(function PythonCodeEditor({ value, disabled = false, maxLength = 20000, onChange }, ref) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const syncingRef = useRef(false);
  const initialValueRef = useRef(value);
  const initialDisabledRef = useRef(disabled);
  const editable = useMemo(() => new Compartment(), []);
  const [cursor, setCursor] = useState({ line: 1, column: 1 });

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!hostRef.current) return;
    const state = EditorState.create({
      doc: initialValueRef.current,
      extensions: [
        basicSetup,
        python(),
        oneDark,
        editorTheme,
        EditorState.tabSize.of(4),
        indentUnit.of('    '),
        keymap.of([{ key: 'Tab', run: acceptCompletion }, indentWithTab]),
        autocompletion({
          activateOnTyping: true,
          activateOnTypingDelay: 75,
          interactionDelay: 0,
          maxRenderedOptions: 60,
          optionClass: completion => completion.type ? `completion-${completion.type}` : '',
          override: [smartPythonCompletion, localCompletionSource, globalCompletion],
        }),
        editable.of([
          EditorView.editable.of(!initialDisabledRef.current),
          EditorState.readOnly.of(initialDisabledRef.current),
        ]),
        EditorState.transactionFilter.of(transaction => transaction.docChanged && transaction.newDoc.length > maxLength ? [] : transaction),
        EditorView.contentAttributes.of({
          'aria-label': 'Python 代码编辑器',
          'aria-multiline': 'true',
          autocapitalize: 'off',
          autocomplete: 'off',
          autocorrect: 'off',
          spellcheck: 'false',
        }),
        EditorView.updateListener.of(update => {
          if (update.docChanged && !syncingRef.current) onChangeRef.current(update.state.doc.toString());
          if (update.selectionSet || update.docChanged) {
            const position = update.state.doc.lineAt(update.state.selection.main.head);
            setCursor({ line: position.number, column: update.state.selection.main.head - position.from + 1 });
          }
        }),
      ],
    });
    const view = new EditorView({ state, parent: hostRef.current });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [editable, maxLength]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({ effects: editable.reconfigure([
      EditorView.editable.of(!disabled),
      EditorState.readOnly.of(disabled),
    ]) });
  }, [disabled, editable]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view || view.state.doc.toString() === value) return;
    syncingRef.current = true;
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } });
    syncingRef.current = false;
  }, [value]);

  useImperativeHandle(ref, () => ({
    focus: () => viewRef.current?.focus(),
    selectRange: (from, to) => {
      const view = viewRef.current;
      if (!view) return;
      const safeFrom = Math.max(0, Math.min(from, view.state.doc.length));
      const safeTo = Math.max(safeFrom, Math.min(to, view.state.doc.length));
      view.dispatch({
        selection: { anchor: safeFrom, head: safeTo },
        effects: EditorView.scrollIntoView(safeFrom, { y: 'center' }),
      });
      view.focus();
    },
    showCompletions: () => {
      const view = viewRef.current;
      if (!view) return;
      view.focus();
      requestAnimationFrame(() => {
        view.focus();
        if (!completionStatus(view.state)) startCompletion(view);
      });
    },
  }), []);

  return <div className={'python-code-editor' + (disabled ? ' is-disabled' : '')}>
    <div ref={hostRef} className="python-code-editor-host" />
    <div className="python-code-editor-status" aria-hidden="true">
      <span>第 {cursor.line} 行，第 {cursor.column} 列</span>
      <span className="python-code-editor-status-fill" />
      <span>Python</span>
      <span>空格：4</span>
      <span className="python-code-editor-shortcut">上下文补全 · Ctrl / ⌘ + Space</span>
    </div>
  </div>;
});
