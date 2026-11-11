// The help center must match the app. Every button/label the docs name exists in the app source, and every one is documented.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error plain JS content module
import { pages } from './pages.mjs';

const LABELS = ['Create an account', 'Create account', 'Sign in', 'Add a task', 'Show 200 more', 'Folder', 'Archive', 'View archived', 'Restore', 'New folder', 'Create folder', 'Delete folder', 'New group', 'Priority labels', 'Reminder', 'Remind me at', 'Tomorrow morning', 'Dismiss', 'Copy',
  'Save key', 'I understand, turn on AI', 'Test connection', 'Remove key', 'Replace key', 'Save name', 'Download JSON backup', 'Open history', 'Add to what I have', 'Replace everything with this backup', 'Download a copy of my current workspace',
  'Download my unsent changes', 'Use the latest version', 'Sign out', 'Saved on this device, not synced', 'This changed on another device', 'Needs your attention', 'Activity Log', 'Activity', 'More'];

const walk = (d: string): string[] => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? (f === 'node_modules' || f === 'dist' ? [] : walk(p)) : /\.tsx?$/.test(f) ? [p] : []; });
const appSource = walk(join(__dirname, '..', 'web')).map(f => readFileSync(f, 'utf8')).join('\n').replace(/&amp;/g, '&');
const strip = (h: string) => h.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/\s+/g, ' ');
const docs = (pages as { body: string }[]).map(p => strip(p.body)).join(' ');

describe('help center matches the app', () => {
  it.each(LABELS)('"%s" is documented', label => { expect(docs, label).toContain(label); });
  it.each(LABELS)('"%s" exists in the app', label => { expect(appSource, label).toContain(label); });
  it('has a Getting started page and a page for every area of the app', () => {
    const slugs = (pages as { slug: string }[]).map(p => p.slug);
    for (const s of ['index', 'getting-started', 'list', 'reminders', 'status-and-tasks', 'assistant', 'activity-log', 'folders', 'ai-setup', 'backup-and-settings', 'account-and-privacy', 'faq']) expect(slugs).toContain(s);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
  it('covers the features people need to know about', () => {
    for (const phrase of ['Quick Capture', 'one question at a time', 'never sends', 'backup', 'own key', 'Reminders show only while Exe is open', 'Activity Log']) expect(docs.toLowerCase(), phrase).toContain(phrase.toLowerCase());
  });
  it('does not promise things the app does not do', () => {
    expect(docs).not.toMatch(/real[- ]time sync|updates live (?!while)|research with sources/i);
  });
});
