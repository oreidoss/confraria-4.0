import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarPlus, History, UserPlus, Users, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

function HomePage() {
  const navigate = useNavigate();
  const [showAddParticipant, setShowAddParticipant] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    pix: '',
    confraria: ''
  });
  const [error, setError] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showAddParticipant && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [showAddParticipant]);

  const handleAddParticipant = async () => {
    if (!formData.nome.trim()) {
      setError('Por favor, preencha o nome do participante.');
      return;
    }

    try {
      // Primeiro, verifica se já existe um participante com o mesmo nome
      const { data: existingParticipant } = await supabase
        .from('participantes')
        .select('nome')
        .ilike('nome', formData.nome.trim())
        .single();

      if (existingParticipant) {
        setError('Já existe um participante com este nome. Por favor, escolha outro nome.');
        return;
      }

      // Se não existir, insere o novo participante
      const { error: insertError } = await supabase
        .from('participantes')
        .insert([{
          nome: formData.nome.trim(),
          pix: formData.pix.trim() || null,
          confraria: formData.confraria
        }]);

      if (insertError) throw insertError;

      setShowAddParticipant(false);
      setFormData({ nome: '', pix: '', confraria: '' });
      setError('');
      navigate('/participantes');
    } catch (error) {
      console.error('Error adding participant:', error);
      setError('Erro ao adicionar participante. Tente novamente.');
    }
  };

  const handleSaveEdit = async () => {
    if (!editingParticipant) return;

    try {
      const { error } = await supabase
        .from('participantes')
        .update({
          nome: editForm.nome,
          pix: editForm.pix,
          confraria: editForm.confraria === 'sim' // Converte para booleano
        })
        .eq('id', editingParticipant.id);

      if (error) throw error;
      setShowEditModal(false);
      setEditingParticipant(null);
      loadParticipants();
    } catch (error) {
      console.error('Error updating participant:', error);
      setError('Erro ao atualizar participante. Tente novamente.');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center mb-8">Evento Confrarias</h1>
      
      <div className="max-w-md mx-auto space-y-4">
        <button
          onClick={() => navigate('/criar-evento')}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white p-4 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <CalendarPlus className="w-6 h-6" />
          <span>Criar Novo Evento</span>
        </button>
        
        <button
          onClick={() => navigate('/historico')}
          className="w-full flex items-center justify-center gap-2 bg-green-600 text-white p-4 rounded-lg hover:bg-green-700 transition-colors"
        >
          <History className="w-6 h-6" />
          <span>Histórico de Eventos</span>
        </button>

        <button
          onClick={() => setShowAddParticipant(true)}
          className="w-full flex items-center justify-center gap-2 bg-sky-600 text-white p-4 rounded-lg hover:bg-sky-700 transition-colors"
        >
          <UserPlus className="w-6 h-6" />
          <span>Cadastrar Participante</span>
        </button>

        <button
          onClick={() => navigate('/participantes')}
          className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white p-4 rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Users className="w-6 h-6" />
          <span>Lista de Participantes</span>
        </button>
      </div>

      {/* Modal de Cadastro de Participante */}
      {showAddParticipant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-4 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-sky-900">Cadastrar Novo Participante</h3>
              <button
                onClick={() => {
                  setShowAddParticipant(false);
                  setFormData({ nome: '', pix: '', confraria: '' });
                  setError('');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">
                {error}
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome <span className="text-red-500">*</span>
                </label>
                <input
                  ref={nameInputRef}
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-sky-500 focus:ring-sky-500"
                  placeholder="Nome do participante"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  PIX <span className="text-gray-400 text-xs">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={formData.pix}
                  onChange={(e) => setFormData({ ...formData, pix: e.target.value })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-sky-500 focus:ring-sky-500"
                  placeholder="Chave PIX"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confraria
                </label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="confraria"
                      value="sim"
                      checked={formData.confraria === 'sim'}
                      onChange={(e) => setFormData({ ...formData, confraria: e.target.value })}
                      className="form-radio"
                    />
                    <span className="ml-2">Sim</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="confraria"
                      value="nao"
                      checked={formData.confraria === 'nao'}
                      onChange={(e) => setFormData({ ...formData, confraria: e.target.value })}
                      className="form-radio"
                    />
                    <span className="ml-2">Não</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowAddParticipant(false);
                    setFormData({ nome: '', pix: '', confraria: '' });
                    setError('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAddParticipant}
                  className="px-4 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700"
                >
                  Cadastrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HomePage;
