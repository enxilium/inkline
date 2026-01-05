-- Migration: Add feature flags to user preferences
-- This updates the default preferences JSONB to include the features object

-- Update the default value for the preferences column
ALTER TABLE public.users 
ALTER COLUMN preferences 
SET DEFAULT '{"theme": "system", "editorFontSize": 16, "editorFontFamily": "sans-serif", "defaultImageAiModel": "flux", "features": {"aiChatEnabled": true, "imageGenerationEnabled": false, "audioGenerationEnabled": false}}'::jsonb;

-- Update existing users to have the features field if they don't already have it
UPDATE public.users
SET preferences = preferences || '{"features": {"aiChatEnabled": true, "imageGenerationEnabled": false, "audioGenerationEnabled": false}}'::jsonb
WHERE NOT (preferences ? 'features');

-- Add a comment for documentation
COMMENT ON COLUMN public.users.preferences IS 'User preferences including theme, editor settings, and feature flags for AI capabilities';
