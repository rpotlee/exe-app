// The help center must match the app. Every button/label the docs name exists in the app source, and every one is documented.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error plain JS content module
import { pages } from './pages.mjs';

const LABELS = ['Create an account', 'Create account', 'Sign in', 'Add a to-do', 'Show 200 more', 'File in', 'Archive', 'View archived', 'Approve & organize', 'Not now', 'Reject', 'Split…', 'Preview merge', 'Approve selected', 'Approve all', 'Review again',
  'Get AI suggestions', 'New folder', 'Create folder', 'Delete folder', 'Add outcome', 'Edit outcome', 'Pin as priority', 'Make active', 'Move to Next', 'Move to Later', 'Mark outcome done…', 'Reopen outcome', 'Add step', 'Break it down', 'Move up', 'Move down',
  'Archive step', 'Add relationship', 'New decision', 'Edit question', 'Add option', 'Mark resolved', 'Confirm decision', 'Reopen decision', 'Enter Focus Mode', 'All steps', 'Why this?', 'Apply…', 'Start in Focus Mode', 'Skip this week', 'Capture thought',
  'Return to Exe', 'Finish session', 'Add steps', 'Suggest steps with AI', 'Add idea', 'Promote', 'Show archived ideas', 'Save name', 'Download JSON backup', 'Open history', 'Test connection', 'I understand, turn on AI', 'Remove key', 'Replace key', 'Save key',
  'Download my unsent changes', 'Use the latest version', 'Sign out', 'Next & Later', 'Set aside', 'Recently approved', 'Side by side', 'Add to what I have', 'Replace everything with this backup', 'Download a copy of my current workspace',
  'Saved on this device, not synced', 'Needs your attention', 'This changed on another device', 'Nothing here yet', 'Original capture', 'Definition of done', 'Where does this step go?', 'Evidence', 'Suggested follow-up', 'Decision log', 'Archived steps'];

const walk = (d: string): string[] => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? (f === 'node_modules' || f === 'dist' ? [] : walk(p)) : /\.tsx?$/.test(f) ? [p] : []; });
const appSource = walk(join(__dirname, '..', 'web')).map(f => readFileSync(f, 'utf8')).join('\n').replace(/&amp;/g, '&');
const strip = (h: string) => h.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/\s+/g, ' ');
const docs = (pages as { body: string }[]).map(p => strip(p.body)).join(' ');

describe('help center matches the app', () => {
  it.each(LABELS)('"%s" is documented', label => { expect(docs, label).toContain(label); });
  it.each(LABELS)('"%s" exists in the app', label => { expect(appSource, label).toContain(label); });
  it('has a Getting started page and a page for every area of the app', () => {
    const slugs = (pages as { slug: string }[]).map(p => p.slug);
    for (const s of ['index', 'getting-started', 'capture-and-inbox', 'ai-review', 'map', 'decisions', 'focus', 'ideas-and-search', 'ai-setup', 'backup-and-settings', 'account-and-privacy', 'faq']) expect(slugs).toContain(s);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
  it('covers the features people need to know about', () => {
    for (const phrase of ['at most three', 'never scores', 'Quick Capture', 'Undo', 'Break it down', 'I have', 'Weekly review', 'Priority suggestions', 'Focus Mode', 'confirmed', 'backup', 'own key', 'Search', 'Ideas', 'loose']) expect(docs.toLowerCase(), phrase).toContain(phrase.toLowerCase());
  });
  it('does not promise things the app does not do', () => {
    expect(docs).not.toMatch(/real[- ]time sync|updates live (?!while)|research with sources/i);
  });
});
