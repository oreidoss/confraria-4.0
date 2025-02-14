import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';

interface Event {
  id: string;
  nome: string;
  data: string;
  horario: string;
  status: string;
  detalhes_evento: {
    valor_gasto: number;
    participante_id: string;
    confirmado: boolean;
  }[];
}

function EventHistoryPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
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
        .order('data', { ascending: false });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error loading events:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este evento?')) {
      try {
        const { error } = await supabase
          .from('eventos')
          .delete()
          .eq('id', id);

        if (error) throw error;
        loadEvents();
      } catch (error) {
        console.error('Error deleting event:', error);
      }
    }
  };

  const handleFinalize = async (id: string) => {
    try {
      const { error } = await supabase
        .from('eventos')
        .update({ status: 'finalizado' })
        .eq('id', id);

      if (error) throw error;
      loadEvents();
    } catch (error) {
      console.error('Error finalizing event:', error);
    }
  };

  const handleRevertFinalize = async (id: string) => {
    try {
      const { error } = await supabase
        .from('eventos')
        .update({ status: 'ativo' })
        .eq('id', id);

      if (error) throw error;
      loadEvents();
    } catch (error) {
      console.error('Error reverting finalization:', error);
    }
  };

  const calculateTotalValue = (event: Event): number => {
    return event.detalhes_evento.reduce((sum, detail) => sum + (detail.valor_gasto || 0), 0);
  };

  const getParticipantsCount = (event: Event): number => {
    return event.detalhes_evento.length;
  };

  return (
    <div className="container mx-auto px-4 py-4 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1 text-sky-600 hover:text-sky-700 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>
        <h1 className="text-xl font-semibold text-sky-900">Histórico de Eventos</h1>
      </div>

      <div className="grid gap-3">
        {events.map((event) => {
          const participantsCount = getParticipantsCount(event);

          return (
            <div
              key={event.id}
              className="bg-white rounded-lg shadow-sm p-3 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-semibold text-sky-900">{event.nome}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      event.status === 'finalizado'
                        ? 'bg-gray-100 text-gray-700'
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {event.status === 'finalizado' ? 'Finalizado' : 'Em andamento'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <p className="text-gray-900">
                      {format(new Date(event.data), 'dd/MM/yyyy')} às {event.horario.slice(0, 5)}
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-1">
                  <button
                    onClick={() => navigate(`/evento/${event.id}`)}
                    className="p-1.5 text-sky-600 hover:bg-sky-50 rounded"
                    title="Visualizar evento"
                  >
                    Visualizar
                  </button>
                  {event.status === 'ativo' ? (
                    <button
                      onClick={() => handleFinalize(event.id)}
                      className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                      title="Finalizar evento"
                    >
                      Finalizar
                    </button>
                  ) : (
                    <button
                      onClick={() => handleRevertFinalize(event.id)}
                      className="p-1.5 text-yellow-600 hover:bg-yellow-50 rounded"
                      title="Reverter finalização"
                    >
                      Reverter
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(event.id)}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                    title="Excluir evento"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default EventHistoryPage;