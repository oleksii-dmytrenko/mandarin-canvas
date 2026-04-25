# Mandarin Canvas

Drawing app for Mandarin learners. Text blocks with pinyin/zhuyin, freehand drawing, images, multi-page.

## Stack

React + Zustand + TypeScript.

## Structure

Layer-based: `components/`, `hooks/`, `stores/`, `types/`, `utils/`.

## State

Zustand store persists pages to localStorage. History (undo/redo) kept separate, not persisted.
