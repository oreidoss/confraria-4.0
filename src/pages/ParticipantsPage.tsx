import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, X, Copy, UserPlus } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Participant {
  id: string;
  nome: string;
  pix: string;
  confraria?: boolean;
  admin?: boolean; // New field added here
}

function ParticipantsPage() {
  const navigate = useNavigate();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const [editForm, setEditForm] = useState({ nome: '', pix: '', confraria: 'nao', admin: false });
  const [error, setError] = useState('');
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [participantToDelete, setParticipantToDelete] = useState<Participant | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadParticipants();
  }, []);

  useEffect(() => {
    if (showAddModal && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [showAddModal]);

  const loadParticipants = async () => {
    try {
      const { data, error } = await supabase
        .from('participantes')
        .select('*')
        .order('nome');

      if (error) throw error;
      setParticipants(data || []);
    } catch (error) {
      console.error('Error loading participants:', error);
    }
  };

  const handleStartEdit = (participant: Participant) => {
    setEditingParticipant(participant);
    setEditForm({ 
      nome: participant.nome, 
      pix: participant.pix, 
      confraria: participant.confraria ? 'sim' : 'nao',
      admin: participant.admin || false // New field handled here
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingParticipant) return;

    try {
      const { error } = await supabase
        .from('participantes')
        .update({
          nome: editForm.nome,
          pix: editForm.pix,
          confraria: editForm.confraria === 'sim',
          admin: editForm.admin // Ensure the admin field is handled
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

  const handleDelete = async (participant: Participant) => {
    setParticipantToDelete(participant);
    setShowDeleteConfirmation(true);
  };

  const confirmDelete = async () => {
    if (!participantToDelete) return;

    try {
      // Primeiro remove o participante de todos os eventos (detalhes_evento)
      const { error: detailsError } = await supabase
        .from('detalhes_evento')
        .delete()
        .eq('participante_id', participantToDelete.id);

      if (detailsError) throw detailsError;

      // Depois remove o participante da tabela de participantes
      const { error: participantError } = await supabase
        .from('participantes')
        .delete()
        .eq('id', participantToDelete.id);

      if (participantError) throw participantError;

      setShowDeleteConfirmation(false);
      setParticipantToDelete(null);
      loadParticipants();
    } catch (error) {
      console.error('Error deleting participant:', error);
      setError('Erro ao excluir participante. Tente novamente.');
    }
  };

  const handleAddParticipant = async () => {
    if (!editForm.nome.trim()) {
      setError('Por favor, preencha o nome do participante.');
      return;
    }

    try {
      // Verifica se já existe um participante com o mesmo nome
      const { data: existingParticipant } = await supabase
        .from('participantes')
        .select('nome')
        .ilike('nome', editForm.nome.trim())
        .single();

      if (existingParticipant) {
        setError('Já existe um participante com este nome. Por favor, escolha outro nome.');
        return;
      }

      const { error: insertError } = await supabase
        .from('participantes')
        .insert([{
          nome: editForm.nome.trim(),
          pix: editForm.pix.trim() || null,
          admin: editForm.admin // Ensure the admin field is handled here
        }]);

      if (insertError) throw insertError;

      setShowAddModal(false);
      setEditForm({ nome: '', pix: '', confraria: 'nao', admin: false });
      setError('');
      loadParticipants();
    } catch (error) {
      console.error('Error adding participant:', error);
      setError('Erro ao adicionar participante. Tente novamente.');
    }
  };

  // Função para atualizar o campo "Confraria"
  const handleConfrariaChange = async (id: string, value: boolean) => {
    try {
      const { error } = await supabase
        .from('participantes')
        .update({ confraria: value })
        .eq('id', id);

      if (error) throw error;
      loadParticipants();
    } catch (error) {
      console.error('Error updating confraria:', error);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1 text-sky-600 hover:text-sky-700 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>
        <h1 className="text-xl font-semibold text-sky-900">Lista de Participantes</h1>
        <button
          onClick={() => {
            setShowAddModal(true);
            setEditForm({ nome: '', pix: '', confraria: 'nao', admin: false });
            setError('');
          }}
          className="flex items-center gap-1 bg-sky-600 text-white px-3 py-1.5 rounded text-sm hover:bg-sky-700 transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Novo Participante
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="space-y-3">
          {participants.map((participant) => (
            <div
              key={participant.id}
              className="border border-sky-100 rounded p-3 bg-sky-50 hover:bg-sky-100 transition-colors"
            >
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h3 className="font-medium text-sky-900">{participant.nome}</h3>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-sky-600 font-medium">PIX:</span>
                    <code className="bg-white px-2 py-0.5 rounded text-sky-700">
                      {participant.pix}
                    </code>
                    <button
                      onClick={() => navigator.clipboard.writeText(participant.pix)}
                      className="p-1 text-sky-500 hover:text-sky-700"
                      title="Copiar PIX"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-sky-600 font-medium">Confraria:</span>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name={`confraria-${participant.id}`}
                          value="sim"
                          checked={participant.confraria === true}
                          onChange={() => handleConfrariaChange(participant.id, true)}
                          className="form-radio"
                        />
                        <span className="ml-2">Sim</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name={`confraria-${participant.id}`}
                          value="nao"
                          checked={participant.confraria === false}
                          onChange={() => handleConfrariaChange(participant.id, false)}
                          className="form-radio"
                        />
                        <span className="ml-2">Não</span>
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-sky-600 font-medium">Admin:</span>
                    <input
                      type="checkbox"
                      checked={participant.admin || false}
                      onChange={(e) => handleConfrariaChange(participant.id, e.target.checked)}
                      className="form-checkbox"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleStartEdit(participant)}
                    className="p-1 text-sky-600 hover:text-sky-700"
                    title="Editar participante"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(participant)}
                    className="p-1 text-red-500 hover:text-red-700"
                    title="Excluir participante"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {participants.length === 0 && (
            <p className="text-center text-gray-500 py-4">
              Nenhum participante cadastrado.
            </p>
          )}
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-4 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-sky-900">Novo Participante</h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditForm({ nome: '', pix: '', confraria: 'nao', admin: false });
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
                  value={editForm.nome}
                  onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })}
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
                  value={editForm.pix}
                  onChange={(e) => setEditForm({ ...editForm, pix: e.target.value })}
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
                      checked={editForm.confraria === 'sim'}
                      onChange={(e) => setEditForm({ ...editForm, confraria: e.target.value })}
                      className="form-radio"
                    />
                    <span className="ml-2">Sim</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="confraria"
                      value="nao"
                      checked={editForm.confraria === 'nao'}
                      onChange={(e) => setEditForm({ ...editForm, confraria: e.target.value })}
                      className="form-radio"
                    />
                    <span className="ml-2">Não</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Admin
                </label>
                <input
                  type="checkbox"
                  checked={editForm.admin}
                  onChange={(e) => setEditForm({ ...editForm, admin: e.target.checked })}
                  className="form-checkbox"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setEditForm({ nome: '', pix: '', confraria: 'nao', admin: false });
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

      {/* Edit Modal */}
      {showEditModal && editingParticipant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-4 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-sky-900">Editar Participante</h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingParticipant(null);
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
                  Nome
                </label>
                <input
                  type="text"
                  value={editForm.nome}
                  onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-sky-500 focus:ring-sky-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  PIX
                </label>
                <input
                  type="text"
                  value={editForm.pix}
                  onChange={(e) => setEditForm({ ...editForm, pix: e.target.value })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-sky-500 focus:ring-sky-500"
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
                      checked={editForm.confraria === 'sim'}
                      onChange={(e) => setEditForm({ ...editForm, confraria: e.target.value })}
                      className="form-radio"
                    />
                    <span className="ml-2">Sim</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="confraria"
                      value="nao"
                      checked={editForm.confraria === 'nao'}
                      onChange={(e) => setEditForm({ ...editForm, confraria: e.target.value })}
                      className="form-radio"
                    />
                    <span className="ml-2">Não</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Admin
                </label>
                <input
                  type="checkbox"
                  checked={editForm.admin}
                  onChange={(e) => setEditForm({ ...editForm, admin: e.target.checked })}
                  className="form-checkbox"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingParticipant(null);
                    setError('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-4 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg
