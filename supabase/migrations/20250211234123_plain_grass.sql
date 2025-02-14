/*
  # Add confirmation status to event details

  1. Changes
    - Add `confirmado` boolean column to `detalhes_evento` table with default value of false
    
  2. Purpose
    - Track participant confirmation status for each event
    - Allow event organizers to manage attendance
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'detalhes_evento' 
    AND column_name = 'confirmado'
  ) THEN
    ALTER TABLE detalhes_evento 
    ADD COLUMN confirmado boolean DEFAULT false;
  END IF;
END $$;