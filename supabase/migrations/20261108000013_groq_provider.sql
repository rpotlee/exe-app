-- Adds Groq as a fourth AI provider (additive, reversible). Nothing else changes.
-- To undo: delete any groq rows, then re-add the old check:
--   alter table user_ai_settings drop constraint user_ai_settings_provider_check;
--   alter table user_ai_settings add constraint user_ai_settings_provider_check check (provider in ('anthropic', 'openai', 'gemini'));
alter table user_ai_settings drop constraint user_ai_settings_provider_check;
alter table user_ai_settings add constraint user_ai_settings_provider_check check (provider in ('anthropic', 'openai', 'gemini', 'groq'));
