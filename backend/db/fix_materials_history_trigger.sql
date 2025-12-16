-- Fix create_materials_history trigger to handle both cover_letters and uploaded_cover_letters
-- This allows the history table to work with cover letters from either table
-- WITHOUT changing the database schema (only updates the trigger function)

CREATE OR REPLACE FUNCTION create_materials_history()
RETURNS TRIGGER AS $$
DECLARE
    action_type TEXT;
    prev_resume_id INTEGER;
    prev_cover_letter_id INTEGER;
    valid_cover_letter_id INTEGER;
    cover_letter_exists_in_uploaded BOOLEAN := FALSE;
    cover_letter_exists_in_regular BOOLEAN := FALSE;
BEGIN
    -- Determine action type based on what changed
    IF TG_OP = 'INSERT' THEN
        action_type := 'initial_set';
        prev_resume_id := NULL;
        prev_cover_letter_id := NULL;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Check what changed
        IF OLD.resume_id IS DISTINCT FROM NEW.resume_id AND OLD.cover_letter_id IS DISTINCT FROM NEW.cover_letter_id THEN
            action_type := 'both_changed';
        ELSIF OLD.resume_id IS DISTINCT FROM NEW.resume_id THEN
            action_type := 'changed_resume';
        ELSIF OLD.cover_letter_id IS DISTINCT FROM NEW.cover_letter_id THEN
            action_type := 'changed_cover_letter';
        ELSE
            action_type := 'updated';
        END IF;
        prev_resume_id := OLD.resume_id;
        prev_cover_letter_id := OLD.cover_letter_id;
    END IF;

    -- Validate cover_letter_id exists in either uploaded_cover_letters or cover_letters
    valid_cover_letter_id := NULL;
    IF NEW.cover_letter_id IS NOT NULL THEN
        -- Check uploaded_cover_letters first (newer table)
        BEGIN
            SELECT EXISTS(
                SELECT 1 FROM uploaded_cover_letters 
                WHERE id = NEW.cover_letter_id AND user_id = NEW.user_id
            ) INTO cover_letter_exists_in_uploaded;
        EXCEPTION
            WHEN undefined_table THEN
                cover_letter_exists_in_uploaded := FALSE;
        END;
        
        IF cover_letter_exists_in_uploaded THEN
            valid_cover_letter_id := NEW.cover_letter_id;
        ELSE
            -- Check cover_letters table (older table)
            BEGIN
                SELECT EXISTS(
                    SELECT 1 FROM cover_letters 
                    WHERE id = NEW.cover_letter_id AND user_id = NEW.user_id
                ) INTO cover_letter_exists_in_regular;
            EXCEPTION
                WHEN undefined_table THEN
                    cover_letter_exists_in_regular := FALSE;
            END;
            
            IF cover_letter_exists_in_regular THEN
                valid_cover_letter_id := NEW.cover_letter_id;
            ELSE
                -- Cover letter doesn't exist in either table, set to NULL to avoid FK violation
                valid_cover_letter_id := NULL;
                RAISE WARNING 'Cover letter ID % not found in uploaded_cover_letters or cover_letters, setting to NULL in history', NEW.cover_letter_id;
            END IF;
        END IF;
    END IF;

    -- Insert history record (only if at least one material is valid)
    IF NEW.resume_id IS NOT NULL OR valid_cover_letter_id IS NOT NULL THEN
        BEGIN
            INSERT INTO application_materials_history (
                user_id,
                job_id,
                resume_id,
                cover_letter_id,
                action,
                details
            ) VALUES (
                NEW.user_id,
                NEW.job_id,
                NEW.resume_id,
                valid_cover_letter_id,  -- Use validated cover_letter_id (may be NULL)
                action_type,
                jsonb_build_object(
                    'previous_resume_id', prev_resume_id,
                    'previous_cover_letter_id', prev_cover_letter_id,
                    'original_cover_letter_id', NEW.cover_letter_id,  -- Store original for reference
                    'cover_letter_source', CASE 
                        WHEN cover_letter_exists_in_uploaded THEN 'uploaded_cover_letters'
                        WHEN cover_letter_exists_in_regular THEN 'cover_letters'
                        ELSE 'not_found'
                    END
                )
            );
        EXCEPTION
            WHEN foreign_key_violation THEN
                -- If FK violation still occurs, try with NULL cover_letter_id
                RAISE WARNING 'FK violation for cover_letter_id %, inserting with NULL', NEW.cover_letter_id;
                INSERT INTO application_materials_history (
                    user_id,
                    job_id,
                    resume_id,
                    cover_letter_id,
                    action,
                    details
                ) VALUES (
                    NEW.user_id,
                    NEW.job_id,
                    NEW.resume_id,
                    NULL,  -- Force NULL to avoid FK violation
                    action_type,
                    jsonb_build_object(
                        'previous_resume_id', prev_resume_id,
                        'previous_cover_letter_id', prev_cover_letter_id,
                        'original_cover_letter_id', NEW.cover_letter_id,
                        'cover_letter_source', 'fk_violation_avoided'
                    )
                );
        END;
    END IF;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the transaction
        RAISE WARNING 'Error creating materials history: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Verify the trigger exists and is attached
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'trigger_create_materials_history'
    ) THEN
        CREATE TRIGGER trigger_create_materials_history
            AFTER INSERT OR UPDATE ON job_materials
            FOR EACH ROW
            EXECUTE FUNCTION create_materials_history();
    END IF;
END $$;

SELECT '✅ create_materials_history trigger function updated to handle both cover_letters and uploaded_cover_letters' AS status;

