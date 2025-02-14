/*
  # Add expense history table

  1. New Tables
    - `historico_gastos`
      - `id` (uuid, primary key)
      - `detalhe_evento_id` (uuid, foreign key)
      - `valor_gasto` (decimal)
      - `descricao` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `historico_gastos` table
    - Add policies for authenticated users
*/

CREATE TABLE IF NOT EXISTS historico_gastos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  detalhe_evento_id uuid REFERENCES detalhes_evento(id) ON DELETE CASCADE,
  valor_gasto decimal(10,2) NOT NULL,
  descricao text,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE historico_gastos ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for all users"
  ON historico_gastos
  FOR SELECT
  USING (true);

CREATE POLICY "Enable insert for authenticated users"
  ON historico_gastos
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users"
  ON historico_gastos
  FOR UPDATE
  USING (true);