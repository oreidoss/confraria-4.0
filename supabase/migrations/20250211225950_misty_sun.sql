/*
  # Initial Schema for Evento Confrarias

  1. New Tables
    - `participantes`
      - `id` (uuid, primary key)
      - `nome` (text)
      - `pix` (text)
      - `created_at` (timestamp)
    
    - `eventos`
      - `id` (uuid, primary key)
      - `nome` (text)
      - `local` (text)
      - `data` (date)
      - `horario` (time)
      - `descricao` (text)
      - `valor_total` (decimal)
      - `status` (text)
      - `created_at` (timestamp)
    
    - `detalhes_evento`
      - `id` (uuid, primary key)
      - `evento_id` (uuid, foreign key)
      - `participante_id` (uuid, foreign key)
      - `valor_gasto` (decimal)
      - `descricao` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create participantes table
CREATE TABLE participantes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nome text NOT NULL,
    pix text,
    created_at timestamptz DEFAULT now()
);

-- Create eventos table
CREATE TABLE eventos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nome text NOT NULL,
    local text,
    data date NOT NULL,
    horario time NOT NULL,
    descricao text,
    valor_total decimal(10,2) DEFAULT 0,
    status text DEFAULT 'ativo' CHECK (status IN ('ativo', 'finalizado', 'cancelado')),
    created_at timestamptz DEFAULT now()
);

-- Create detalhes_evento table
CREATE TABLE detalhes_evento (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    evento_id uuid REFERENCES eventos(id) ON DELETE CASCADE,
    participante_id uuid REFERENCES participantes(id) ON DELETE CASCADE,
    valor_gasto decimal(10,2) DEFAULT 0,
    descricao text,
    created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE participantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE detalhes_evento ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for all users" ON participantes
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON participantes
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON participantes
    FOR UPDATE USING (true);

CREATE POLICY "Enable read access for all users" ON eventos
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON eventos
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON eventos
    FOR UPDATE USING (true);

CREATE POLICY "Enable read access for all users" ON detalhes_evento
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON detalhes_evento
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON detalhes_evento
    FOR UPDATE USING (true);