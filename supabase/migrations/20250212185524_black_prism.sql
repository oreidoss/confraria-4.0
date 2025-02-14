/*
  # Add historico_gastos table for expense tracking

  1. New Tables
    - `historico_gastos`
      - `id` (uuid, primary key)
      - `detalhe_evento_id` (uuid, foreign key to detalhes_evento)
      - `valor_gasto` (decimal, required)
      - `descricao` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS
    - Add policies for read, insert, and update access
*/

-- Create historico_gastos table if it doesn't exist
CREATE TABLE IF NOT EXISTS historico_gastos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  detalhe_evento_id uuid REFERENCES detalhes_evento(id) ON DELETE CASCADE,
  valor_gasto decimal(10,2) NOT NULL,
  descricao text,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security if not already enabled
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'historico_gastos'
    AND rowsecurity = true
  ) THEN
    ALTER TABLE historico_gastos ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Create policies if they don't exist
DO $$ 
BEGIN
  -- Select policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'historico_gastos' 
    AND policyname = 'Enable read access for all users'
  ) THEN
    CREATE POLICY "Enable read access for all users"
      ON historico_gastos
      FOR SELECT
      USING (true);
  END IF;

  -- Insert policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'historico_gastos' 
    AND policyname = 'Enable insert for authenticated users'
  ) THEN
    CREATE POLICY "Enable insert for authenticated users"
      ON historico_gastos
      FOR INSERT
      WITH CHECK (true);
  END IF;

  -- Update policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'historico_gastos' 
    AND policyname = 'Enable update for authenticated users'
  ) THEN
    CREATE POLICY "Enable update for authenticated users"
      ON historico_gastos
      FOR UPDATE
      USING (true);
  END IF;
END $$;