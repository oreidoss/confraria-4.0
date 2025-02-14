import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Edit, Plus, X, Copy, Check, AlertCircle, UserPlus, CheckCircle, Trash2, PlusCircle, Users, Pencil } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';

interface Event {
  id: string;
  nome: string;
  local: string;
  data: string;
  horario: string;
  descricao: string;
  valor_total: number;
  status: string;
}

interface Participant {
  id: string;
  nome: string;
  pix: string;
  confirmado?: boolean;
  valor_gasto?: number;
  descricao?: string;
  detalhe_id?: string;
}

interface PaymentDetail {
  from: string;
  to: string;
  amount: number;
  fromPix: string;
  toPix: string;
}

function EventDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [availableParticipants, setAvailableParticipants] = useState<Participant[]>([]);
  const [showAddParticipant, setShowAddParticipant] = useState(false);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [confirmedParticipants, setConfirmedParticipants] = useState<string[]>([]);
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetail[]>([]);
  const [editingParticipant, setEditingParticipant] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ nome: '', pix: '' });
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showEditExpense, setShowEditExpense] = useState(false);
  const [selectedParticipantForExpense, setSelectedParticipantForExpense] = useState<Participant | null>(null);
  const [expenseForm, setExpenseForm] = useState({
    valor: '',
    descricao: ''
  });
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [participantToDelete, setParticipantToDelete] = useState<string | null>(null);
  const valorInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (id) {
      loadEventDetails();
      loadParticipants();
      loadAvailableParticipants();
      loadConfirmedParticipants();
    }
  }, [id]);

  useEffect(() => {
    if ((showAddExpense || showEditExpense) && valorInputRef.current) {
      valorInputRef.current.focus();
    }
  }, [showAddExpense, showEditExpense]);

  const loadEventDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('eventos')
        .select(`
          *,
          detalhes_evento (
            valor_gasto,
            participante_id,
            confirmado
          )
        `)
        .eq('id', id);

      if (error) throw error;
      if (data) {
        setEvent(data[0]);
      }
    } catch (error) {
      console.error('Error loading event details:', error);
    }
  };

  const loadParticipants = async () => {
    if (!id) return;
    
    try {
      const { data, error } = await supabase
        .from('detalhes_evento')
        .select(`
          id,
          valor_gasto,
          descricao,
          confirmado,
          participantes:participantes (
            id,
            nome,
            pix
          )
        `)
        .eq('evento_id', id);

      if (error) throw error;

      const uniqueParticipants = data.reduce((acc: Participant[], item) => {
        if (item.participantes) {
          const exists = acc.some(p => p.nome.toLowerCase() === item.participantes.nome.toLowerCase());
          if (!exists) {
            acc.push({
              id: item.participantes.id,
              nome: item.participantes.nome,
              pix: item.participantes.pix,
              confirmado: item.confirmado,
              valor_gasto: item.valor_gasto,
              descricao: item.descricao,
              detalhe_id: item.id,
            });
          }
        }
        return acc;
      }, []);

      // Ordenar participantes por nome
      uniqueParticipants.sort((a, b) => a.nome.localeCompare(b.nome));

      setParticipants(uniqueParticipants);
    } catch (error) {
      console.error('Error loading participants:', error);
    }
  };

  const loadConfirmedParticipants = async () => {
    if (!id) return;
    
    try {
      const { data, error } = await supabase
        .from('detalhes_evento')
        .select('participante_id, confirmado')
        .eq('evento_id', id)
        .eq('confirmado', true);

      if (error) throw error;
      
      const confirmedIds = data.map(item => item.participante_id);
      setConfirmedParticipants(confirmedIds);
      setSelectedParticipants(confirmedIds);
    } catch (error) {
      console.error('Error loading confirmed participants:', error);
    }
  };

  const loadAvailableParticipants = async () => {
    if (!id) return;

    try {
      // First, get all participants from the participantes table
      const { data: allParticipants, error: participantsError } = await supabase
        .from('participantes')
        .select('*')
        .order('nome');

      if (participantsError) throw participantsError;

      // Then, get all participants already in this event
      const { data: eventParticipants, error: eventParticipantsError } = await supabase
        .from('detalhes_evento')
        .select('participante_id')
        .eq('evento_id', id);

      if (eventParticipantsError) throw eventParticipantsError;

      // Create a set of participant IDs already in the event
      const existingParticipantIds = new Set(eventParticipants.map(p => p.participante_id));

      // Filter out participants that are already in the event
      const availableParticipantsList = allParticipants.filter(p => !existingParticipantIds.has(p.id));
      
      setAvailableParticipants(availableParticipantsList);
    } catch (error) {
      console.error('Error loading available participants:', error);
    }
  };

  const handleConfirmParticipants = async () => {
    if (!id || selectedParticipants.length === 0) return;

    try {
      const { data: existingParticipants } = await supabase
        .from('detalhes_evento')
        .select('participante_id')
        .eq('evento_id', id);

      const existingIds = existingParticipants?.map(p => p.participante_id) || [];

      const newParticipantIds = selectedParticipants.filter(id => !existingIds.includes(id));

      const existingUpdates = selectedParticipants
        .filter(id => existingIds.includes(id))
        .map(participantId => ({
          evento_id: id,
          participante_id: participantId,
          confirmado: true
        }));

      if (existingUpdates.length > 0) {
        const { error: updateError } = await supabase
          .from('detalhes_evento')
          .upsert(existingUpdates);

        if (updateError) throw updateError;
      }

      if (newParticipantIds.length > 0) {
        const newParticipants = newParticipantIds.map(participantId => ({
          evento_id: id,
          participante_id: participantId,
          confirmado: true,
          valor_gasto: 0
        }));

        const { error: insertError } = await supabase
          .from('detalhes_evento')
          .insert(newParticipants);

        if (insertError) throw insertError;
      }

      setShowAddParticipant(false);
      setSelectedParticipants([]);
      setErrorMessage('');
      await Promise.all([
        loadParticipants(),
        loadAvailableParticipants(),
        loadConfirmedParticipants()
      ]);
    } catch (error) {
      console.error('Error confirming participants:', error);
      setErrorMessage('Erro ao confirmar participantes. Tente novamente.');
    }
  };

  const handleToggleParticipant = (participantId: string) => {
    setSelectedParticipants(prev => 
      prev.includes(participantId)
        ? prev.filter(id => id !== participantId)
        : [...prev, participantId]
    );
    setErrorMessage('');
  };

  const calculatePayments = () => {
    if (!participants.length) return [];

    const totalSpent = participants.reduce((sum, p) => sum + (p.valor_gasto || 0), 0);
    const averagePerPerson = participants.length ? totalSpent / participants.length : 0;

    const balances = participants.map(p => ({
      nome: p.nome,
      pix: p.pix,
      balance: (p.valor_gasto || 0) - averagePerPerson
    }));

    balances.sort((a, b) => b.balance - a.balance);

    const payments: PaymentDetail[] = [];
    let i = 0;
    let j = balances.length - 1;

    while (i < j) {
      const creditor = balances[i];
      const debtor = balances[j];

      if (Math.abs(creditor.balance) < 0.01) { i++; continue; }
      if (Math.abs(debtor.balance) < 0.01) { j--; continue; }

      const amount = Math.min(creditor.balance, -debtor.balance);
      
      if (amount > 0) {
        payments.push({
          from: debtor.nome,
          to: creditor.nome,
          amount: Number(amount.toFixed(2)),
          fromPix: debtor.pix,
          toPix: creditor.pix
        });

        creditor.balance -= amount;
        debtor.balance += amount;

        if (Math.abs(creditor.balance) < 0.01) i++;
        if (Math.abs(debtor.balance) < 0.01) j--;
      }
    }

    // Ordenar pagamentos por nome do pagador
    payments.sort((a, b) => a.from.localeCompare(b.from));

    return payments;
  };

  const handleDeleteParticipant = async (detalheId: string) => {
    if (!detalheId) return;

    try {
      const { error } = await supabase
        .from('detalhes_evento')
        .delete()
        .eq('id', detalheId);

      if (error) throw error;

      setParticipants(prevParticipants => 
        prevParticipants.filter(p => p.detalhe_id !== detalheId)
      );

      setShowDeleteConfirmation(false);
      setParticipantToDelete(null);

      await Promise.all([
        loadParticipants(),
        loadAvailableParticipants()
      ]);
    } catch (error) {
      console.error('Error removing participant from event:', error);
    }
  };

  const handleStartEdit = (participant: Participant) => {
    setEditingParticipant(participant.id);
    setEditForm({ nome: participant.nome, pix: participant.pix });
  };

  const handleSaveEdit = async (participant: Participant) => {
    try {
      const { error } = await supabase
        .from('participantes')
        .update({
          nome: editForm.nome,
          pix: editForm.pix
        })
        .eq('id', participant.id);

      if (error) throw error;
      setEditingParticipant(null);
      loadParticipants();
    } catch (error) {
      console.error('Error updating participant:', error);
    }
  };

  const handleStartEditExpense = (participant: Participant) => {
    setSelectedParticipantForExpense(participant);
    setExpenseForm({
      valor: participant.valor_gasto?.toString() || '',
      descricao: participant.descricao || ''
    });
    setShowEditExpense(true);
  };

  const handleSaveExpense = async () => {
    if (!selectedParticipantForExpense || !expenseForm.valor) return;

    try {
      const valorGasto = parseFloat(expenseForm.valor);
      if (isNaN(valorGasto)) return;

      const { error } = await supabase
        .from('detalhes_evento')
        .update({
          valor_gasto: valorGasto,
          descricao: expenseForm.descricao
        })
        .eq('id', selectedParticipantForExpense.detalhe_id);

      if (error) throw error;

      setShowEditExpense(false);
      setSelectedParticipantForExpense(null);
      setExpenseForm({ valor: '', descricao: '' });
      loadParticipants();
    } catch (error) {
      console.error('Error updating expense:', error);
    }
  };

  const handleAddExpense = async () => {
    if (!selectedParticipantForExpense || !expenseForm.valor) return;

    try {
      const valorGasto = parseFloat(expenseForm.valor);
      if (isNaN(valorGasto)) return;

      // Get current participant details
      const { data: currentDetails } = await supabase
        .from('detalhes_evento')
        .select('valor_gasto, descricao')
        .eq('id', selectedParticipantForExpense.detalhe_id)
        .single();

      if (!currentDetails) return;

      // Calculate new total by adding the new expense
      const newTotal = (currentDetails.valor_gasto || 0) + valorGasto;

      // Append new description
      const newDescription = currentDetails.descricao
        ? `${currentDetails.descricao}\n${expenseForm.descricao}`
        : expenseForm.descricao;

      const { error } = await supabase
        .from('detalhes_evento')
        .update({
          valor_gasto: newTotal,
          descricao: newDescription
        })
        .eq('id', selectedParticipantForExpense.detalhe_id);

      if (error) throw error;

      setShowAddExpense(false);
      setSelectedParticipantForExpense(null);
      setExpenseForm({ valor: '', descricao: '' });
      loadParticipants();
    } catch (error) {
      console.error('Error adding expense:', error);
    }
  };

  useEffect(() => {
    if (participants.length > 0) {
      const payments = calculatePayments();
      setPaymentDetails(payments);
    }
  }, [participants]);

  if (!event) return null;

  const totalSpent = participants.reduce((sum, p) => sum + (p.valor_gasto || 0), 0);
  const averagePerPerson = participants.length ? totalSpent / participants.length : 0;

  const getParticipantBalance = (participant: Participant) => {
    const balance = (participant.valor_gasto || 0) - averagePerPerson;
    return balance;
  };

  return (
    <div className="container mx-auto px-4 py-3 max-w-3xl">
      <button
        onClick={() => navigate('/historico')}
        className="flex items-center gap-1 text-sky-600 hover:text-sky-700 text-sm mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar
      </button>

      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="text-center mb-4">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{event.nome}</h1>
          <p className="text-lg text-gray-600">{event.local}</p>
          <p className="text-gray-500">
            {format(new Date(event.data), 'dd/MM/yyyy')} às {event.horario.slice(0, 5)}
          </p>
          <div className="inline-block bg-green-100 text-green-800 text-sm px-3 py-1 rounded-full mt-2">
            Em andamento
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 mt-6">
          <div className="text-center">
            <p className="text-gray-600 text-sm mb-1">Custos Totais</p>
            <p className="text-4xl font-bold text-gray-900">
              R$ {totalSpent.toFixed(2)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-gray-600 text-sm mb-1">Valor por Participante</p>
            <p className="text-4xl font-bold text-gray-900">
              R$ {averagePerPerson.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 mt-6 text-gray-600">
          <Users className="w-5 h-5" />
          <span className="text-lg">{participants.length} participantes</span>
        </div>
      </div>

      <div className="grid gap-3">
        <div className="bg-white rounded-lg shadow-sm p-3">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-sm font-semibold text-sky-900">Participantes</h2>
            <button
              onClick={() => {
                setShowAddParticipant(true);
                setErrorMessage('');
              }}
              className="flex items-center gap-1 bg-sky-600 text-white px-2 py-1 rounded text-xs hover:bg-sky-700 transition-colors"
            >
              <UserPlus className="w-3 h-3" />
              Adicionar
            </button>
          </div>

          <div className="space-y-2">
            {participants.map((participant) => {
              const balance = getParticipantBalance(participant);
              const isReceiving = balance > 0;
              
              return (
                <div
                  key={participant.detalhe_id}
                  className="border border-sky-100 rounded p-2 bg-sky-50"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      {editingParticipant === participant.id ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={editForm.nome}
                            onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })}
                            className="block w-full rounded border-sky-200 text-xs focus:border-sky-500 focus:ring-sky-500"
                            placeholder="Nome"
                          />
                          <div className="flex items-center gap-1">
                            <span className="text-sky-500 font-medium text-xs">PIX:</span>
                            <input
                              type="text"
                              value={editForm.pix}
                              onChange={(e) => setEditForm({ ...editForm, pix: e.target.value })}
                              className="block w-full rounded border-sky-200 text-xs focus:border-sky-500 focus:ring-sky-500"
                              placeholder="PIX"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSaveEdit(participant)}
                              className="text-xs bg-sky-600 text-white px-2 py-1 rounded hover:bg-sky-700"
                            >
                              Salvar
                            </button>
                            <button
                              onClick={() => setEditingParticipant(null)}
                              className="text-xs bg-gray-500 text-white px-2 py-1 rounded hover:bg-gray-600"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-sky-900 text-sm">{participant.nome}</h3>
                            {participant.confirmado && (
                              <CheckCircle className="w-3 h-3 text-green-500" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-sky-500 font-medium">PIX:</span>
                            <code className="bg-white px-2 py-0.5 rounded text-sky-700">{participant.pix}</code>
                            <button
                              onClick={() => navigator.clipboard.writeText(participant.pix)}
                              className="p-0.5 text-sky-500 hover:text-sky-700"
                              title="Copiar PIX"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                          <div className="flex items-center gap-4 text-xs">
                            <div className="flex items-center gap-1">
                              <span className="font-medium">Gasto:</span>
                              <span>R$ {(participant.valor_gasto || 0).toFixed(2)}</span>
                              <button
                                onClick={() => handleStartEditExpense(participant)}
                                className="p-1 text-sky-500 hover:text-sky-700"
                                title="Editar gasto"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                            </div>
                            <p className="text-gray-900">
                              <span className="font-medium">Rateio:</span> R$ {averagePerPerson.toFixed(2)}
                            </p>
                            <p className={`font-medium ${isReceiving ? 'text-green-600' : 'text-red-600'}`}>
                              {isReceiving ? 'A receber' : 'A pagar'}: R$ {Math.abs(balance).toFixed(2)}
                            </p>
                          </div>
                          {paymentDetails.map((payment) => (
                            payment.from === participant.nome && (
                              <p key={payment.to} className="text-xs text-gray-700">
                                Pagar R$ {payment.amount.toFixed(2)} para {payment.to}
                              </p>
                            )
                          ))}
                          {paymentDetails.map((payment) => (
                            payment.to === participant.nome && (
                              <p key={payment.from} className="text-xs text-gray-700">
                                Receber R$ {payment.amount.toFixed(2)} de {payment.from}
                              </p>
                            )
                          ))}
                          <button
                            onClick={() => {
                              setSelectedParticipantForExpense(participant);
                              setShowAddExpense(true);
                              setExpenseForm({ valor: '', descricao: '' });
                            }}
                            className="text-gray-600 hover:text-gray-900 flex items-center gap-1 text-xs"
                          >
                            <PlusCircle className="w-3 h-3" />
                            Adicionar gasto
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleStartEdit(participant)}
                        className="p-1 text-gray-600 hover:text-gray-900"
                        title="Editar participante"
                      >
                        <Edit className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => {
                          setParticipantToDelete(participant.detalhe_id!);
                          setShowDeleteConfirmation(true);
                        }}
                        className="p-1 text-red-500 hover:text-red-700"
                        title="Remover participante"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-3">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-sm font-semibold text-sky-900">Distribuição de Pagamentos</h2>
            <button
              onClick={() => {
                setShowAddExpense(true);
                setErrorMessage('');
              }}
              className="flex items-center gap-1 bg-sky-600 text-white px-2 py-1 rounded text-xs hover:bg-sky-700 transition-colors"
            >
              <UserPlus className="w-3 h-3" />
              Adicionar
            </button>
          </div>
          
          {paymentDetails.length > 0 ? (
            <div className="space-y-2">
              {paymentDetails.map((payment, index) => (
                <div key={index} className="border border-sky-100 rounded p-2 bg-sky-50">
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <p className="text-sky-700">
                        {payment.from} deve pagar para {payment.to}
                      </p>
                      <p className="text-base font-semibold text-sky-600">
                        R$ {payment.amount.toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <span className="text-sky-500 font-medium">PIX:</span>
                        <code className="bg-white px-2 py-0.5 rounded text-sky-700">{payment.toPix}</code>
                      </div>
                      <button
                        onClick={() => navigator.clipboard.writeText(payment.toPix)}
                        className="p-1 text-sky-500 hover:text-sky-700"
                        title="Copiar PIX"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-sky-500 text-xs py-2">
              Não há pagamentos pendentes para distribuir.
            </p>
          )}
        </div>
      </div>

      {showDeleteConfirmation && participantToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full mx-4">
            <div className="p-6">
              <h3 className="text-2xl font-bold text-center text-gray-900 mb-4">
                Excluir evento?
              </h3>
              <p className="text-center text-gray-600 mb-6">
                Tem certeza que deseja excluir este evento? Esta ação não poderá ser desfeita.
              </p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirmation(false);
                    setParticipantToDelete(null);
                  }}
                  className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDeleteParticipant(participantToDelete)}
                  className="px-6 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddParticipant && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-4 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-sky-900">Adicionar Participantes</h3>
              <button
                onClick={() => {
                  setShowAddParticipant(false);
                  setSelectedParticipants([]);
                  setErrorMessage('');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded flex items-center gap-2 text-sm">
                <AlertCircle className="w-4 h-4" />
                {errorMessage}
              </div>
            )}

            <div className="space-y-4">
              <div className="max-h-60 overflow-y-auto">
                {availableParticipants.length > 0 ? (
                  availableParticipants.map((participant) => (
                    <div
                      key={participant.id}
                      className="flex items-center gap-3 p-2 hover:bg-sky-50 rounded"
                    >
                      <input
                        type="checkbox"
                        id={`participant-${participant.id}`}
                        checked={selectedParticipants.includes(participant.id)}
                        onChange={() => handleToggleParticipant(participant.id)}
                        className="w-4 h-4 text-sky-600 rounded border-sky-300 focus:ring-sky-500"
                      />
                      <label
                        htmlFor={`participant-${participant.id}`}
                        className="flex-1 cursor-pointer"
                      >
                        <div>
                          <div className="font-medium text-sky-900">{participant.nome}</div>
                          <div className="text-sm text-sky-600">
                            <span className="font-medium">PIX:</span> {participant.pix}
                          </div>
                        </div>
                      </label>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-gray-500 text-sm py-4">
                    Não há novos participantes disponíveis para adicionar.
                  </p>
                )}
              </div>

              <button
                onClick={handleConfirmParticipants}
                disabled={selectedParticipants.length === 0}
                className={
                  selectedParticipants.length === 0
                    ? "w-full p-2 rounded flex items-center justify-center gap-2 bg-gray-300 cursor-not-allowed text-gray-500"
                    : "w-full p-2 rounded flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-700 text-white"
                }
              >
                <CheckCircle className="w-4 h-4" />
                Confirmar Participantes
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditExpense && selectedParticipantForExpense && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-4 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-sky-900">
                Editar Gasto de {selectedParticipantForExpense.nome}
              </h3>
              <button
                onClick={() => {
                  setShowEditExpense(false);
                  setSelectedParticipantForExpense(null);
                  setExpenseForm({ valor: '', descricao: '' });
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valor
                </label>
                <input
                  ref={valorInputRef}
                  type="number"
                  step="0.01"
                  min="0"
                  value={expenseForm.valor}
                  onChange={(e) => setExpenseForm({ ...expenseForm, valor: e.target.value })}
                  className="block w-full rounded border-gray-300 focus:border-sky-500 focus:ring-sky-500"
                  placeholder="0.00"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição
                </label>
                <textarea
                  value={expenseForm.descricao}
                  onChange={(e) => setExpenseForm({ ...expenseForm, descricao: e.target.value })}
                  className="block w-full rounded border-gray-300 focus:border-sky-500 focus:ring-sky-500"
                  rows={3}
                  placeholder="Descreva o gasto..."
                />
              </div>

              <button
                onClick={handleSaveExpense}
                disabled={!expenseForm.valor}
                className={
                  !expenseForm.valor
                    ? "w-full p-2 rounded flex items-center justify-center gap-2 bg-gray-300 cursor-not-allowed text-gray-500"
                    : "w-full p-2 rounded flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-700 text-white"
                }
              >
                <Check className="w-4 h-4" />
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddExpense && selectedParticipantForExpense && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-sky-900">
                Adicionar Gasto para {selectedParticipantForExpense.nome}
              </h3>
              <button
                onClick={() => {
                  setShowAddExpense(false);
                  setSelectedParticipantForExpense(null);
                  setExpenseForm({ valor: '', descricao: '' });
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valor
                </label>
                <input
                  ref={valorInputRef}
                  type="number"
                  step="0.01"
                  min="0"
                  value={expenseForm.valor}
                  onChange={(e) => setExpenseForm({ ...expenseForm, valor: e.target.value })}
                  className="block w-full rounded border-gray-300 focus:border-sky-500 focus:ring-sky-500 appearance-none"
                  placeholder="0.00"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição
                </label>
                <textarea
                  value={expenseForm.descricao}
                  onChange={(e) => setExpenseForm({ ...expenseForm, descricao: e.target.value })}
                  className="block w-full rounded border-gray-300 focus:border-sky-500 focus:ring-sky-500"
                  rows={3}
                  placeholder="Descreva o gasto..."
                />
              </div>

              <button
                onClick={handleAddExpense}
                disabled={!expenseForm.valor}
                className={
                  !expenseForm.valor
                    ? "w-full p-2 rounded flex items-center justify-center gap-2 bg-gray-300 cursor-not-allowed text-gray-500"
                    : "w-full p-2 rounded flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-700 text-white"
                }
              >
                <Check className="w-4 h-4" />
                Adicionar Gasto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista de Descrições e Valores */}
      <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Resumo do Evento</h2>
        <ul className="space-y-2">
          {participants.map((participant) => (
            participant.descricao && participant.valor_gasto ? (
              <li key={participant.detalhe_id} className="flex justify-between text-gray-700">
                <span className="text-green-600">{participant.nome}</span>: {participant.descricao}
                <span>R$ {participant.valor_gasto.toFixed(2)}</span>
              </li>
            ) : null
          ))}
        </ul>
        <div className="flex justify-between text-gray-700 font-bold mt-4">
          <span>Total</span>
          <span>R$ {participants.reduce((sum, p) => sum + (p.valor_gasto || 0), 0).toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}

export default EventDetailsPage;