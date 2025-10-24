'use client';

import { useEffect, useState, useRef } from 'react';
import { Loader, Button, TextInput, ActionIcon, Table, Badge, Collapse } from '@mantine/core';
import { IconSend, IconRefresh, IconDatabase, IconCheck, IconX, IconCode, IconDownload } from '@tabler/icons-react';
import Image from 'next/image';

interface SchemaStatus {
  indexed: boolean;
  tablesCount?: number;
  indexedAt?: string;
  message: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sql?: string;
  data?: any[];
  error?: boolean;
  showSql?: boolean;
}

const SAMPLE_QUESTIONS = [
  "Liste les 10 premiers clients",
  "Combien y a-t-il d'utilisateurs actifs ?",
  "Montre les commandes de cette semaine",
  "Quels sont les produits les plus vendus ?",
  "Liste les projets en cours",
  "Donne moi les contacts sans contrat",
  "Affiche les statistiques par région",
];

export default function Home() {
  const [schemaStatus, setSchemaStatus] = useState<SchemaStatus | null>(null);
  const [loadingSchema, setLoadingSchema] = useState(true);
  const [indexing, setIndexing] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    fetchSchemaStatus();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentQuestionIndex((prev) => (prev + 1) % SAMPLE_QUESTIONS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchSchemaStatus = async () => {
    setLoadingSchema(true);
    try {
      const res = await fetch('/api/schema-status');
      const data = await res.json();
      setSchemaStatus(data);
    } catch (error) {
      console.error('Erreur:', error);
    }
    setLoadingSchema(false);
  };

  const handleIndexSchema = async () => {
    setIndexing(true);
    setNotification(null);
    try {
      const res = await fetch('/api/index-schema', { method: 'POST' });
      const data = await res.json();
      
      if (data.success) {
        setNotification({ message: data.message, type: 'success' });
        await fetchSchemaStatus();
      } else {
        setNotification({ message: data.message, type: 'error' });
      }
    } catch (error) {
      setNotification({ 
        message: error instanceof Error ? error.message : 'Erreur inconnue', 
        type: 'error' 
      });
    }
    setIndexing(false);
  };

  const handleSendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Envoyer l'historique complet pour le contexte
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        sql: msg.sql,
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: input,
          history: conversationHistory,
        }),
      });

      const data = await res.json();

      if (data.success) {
        if (data.conversational) {
          // Réponse conversationnelle sans SQL
          const assistantMessage: Message = {
            role: 'assistant',
            content: data.message,
          };
          setMessages((prev) => [...prev, assistantMessage]);
        } else {
          // Réponse avec SQL et données
          const resultMessage = data.rowCount === 0 
            ? '❌ Aucun résultat trouvé' 
            : `✅ ${data.rowCount} résultat(s) trouvé(s)`;
          
          const assistantMessage: Message = {
            role: 'assistant',
            content: data.explanation || resultMessage,
            sql: data.sql,
            data: data.data,
            showSql: false,
          };
          setMessages((prev) => [...prev, assistantMessage]);
        }
      } else {
        const errorMessage: Message = {
          role: 'assistant',
          content: data.message,
          sql: data.sql, // Inclure le SQL qui a échoué
          error: true,
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error) {
      const errorMessage: Message = {
        role: 'assistant',
        content: error instanceof Error ? error.message : 'Erreur inconnue',
        error: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
    }

    setLoading(false);
  };

  const toggleSql = (index: number) => {
    setMessages((prev) =>
      prev.map((msg, i) =>
        i === index ? { ...msg, showSql: !msg.showSql } : msg
      )
    );
  };

  const exportToCSV = (data: any[]) => {
    if (!data || data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map((row) =>
        headers.map((header) => {
          const value = row[header];
          const stringValue = value?.toString() || '';
          // Escape quotes and wrap in quotes if contains comma or quote
          return stringValue.includes(',') || stringValue.includes('"')
            ? `"${stringValue.replace(/"/g, '""')}"`
            : stringValue;
        }).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{
        background: 'linear-gradient(to bottom right, #001489, #171A47, #9652FF)',
      }}
    >
      {/* Liquid background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-1/2 -left-1/2 w-full h-full rounded-full blur-3xl animate-pulse"
          style={{
            background: 'rgba(79, 199, 186, 0.1)',
          }}
        ></div>
        <div
          className="absolute -bottom-1/2 -right-1/2 w-full h-full rounded-full blur-3xl animate-pulse"
          style={{
            background: 'rgba(84, 148, 255, 0.1)',
            animationDelay: '1s',
          }}
        ></div>
      </div>

      <main className="relative z-10 min-h-screen p-6">
        {/* Header */}
        <div className="max-w-7xl mx-auto mb-6">
          <div className="flex items-center justify-between backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-4 shadow-xl">
            <div className="flex items-center gap-4">
              <Image
                src="/VETOPTIM_LOGO_2025_Blanc.svg"
                alt="VetOptim Logo"
                width={150}
                height={40}
                priority
              />
              <div className="h-8 w-px bg-white/30"></div>
              <h1 className="text-xl font-bold text-white">Base de Données IA</h1>
            </div>

            <div className="flex items-center gap-4">
              {/* Schema Status */}
              {loadingSchema ? (
                <Loader size="sm" color="white" />
              ) : schemaStatus?.indexed ? (
                <Badge
                  size="lg"
                  variant="light"
                  leftSection={<IconCheck size={16} />}
                  style={{
                    background: 'rgba(79, 199, 186, 0.2)',
                    color: '#4FC7BA',
                    border: '1px solid rgba(79, 199, 186, 0.3)',
                  }}
                >
                  {schemaStatus.tablesCount} tables indexées
                </Badge>
              ) : (
                <Badge
                  size="lg"
                  variant="light"
                  leftSection={<IconX size={16} />}
                  style={{
                    background: 'rgba(232, 107, 99, 0.2)',
                    color: '#E86B63',
                    border: '1px solid rgba(232, 107, 99, 0.3)',
                  }}
                >
                  Non indexé
                </Badge>
              )}

              <Button
                leftSection={indexing ? <Loader size="xs" color="white" /> : <IconRefresh size={18} />}
                onClick={handleIndexSchema}
                disabled={indexing}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: 'white',
                }}
              >
                {indexing ? 'Indexation...' : 'Réindexer'}
              </Button>
            </div>
          </div>

          {/* Notification */}
          {notification && (
            <div className="mt-4">
              <div
                className="backdrop-blur-xl rounded-xl p-4 border"
                style={{
                  background:
                    notification.type === 'success'
                      ? 'rgba(79, 199, 186, 0.1)'
                      : 'rgba(232, 107, 99, 0.1)',
                  borderColor:
                    notification.type === 'success'
                      ? 'rgba(79, 199, 186, 0.3)'
                      : 'rgba(232, 107, 99, 0.3)',
                }}
              >
                <p
                  className="text-sm font-semibold"
                  style={{
                    color: notification.type === 'success' ? '#4FC7BA' : '#E86B63',
                  }}
                >
                  {notification.message}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Chat Container */}
        <div className="max-w-7xl mx-auto">
          <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl shadow-2xl overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 180px)' }}>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 && !loading && (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <IconDatabase size={64} className="text-white/30 mb-4" />
                  <h2 className="text-2xl font-bold text-white mb-2">
                    Posez vos questions
                  </h2>
                  <p className="text-white/60 max-w-md mb-6">
                    L'IA analysera votre base de données et générera les requêtes SQL
                    appropriées pour répondre à vos questions.
                  </p>
                  
                  {/* Rotating sample questions */}
                  {schemaStatus?.indexed && (
                    <div className="backdrop-blur-xl bg-white/5 border border-white/20 rounded-2xl p-6 max-w-xl">
                      <p className="text-white/60 text-sm mb-3">💡 Exemples de questions :</p>
                      <div className="relative h-12 overflow-hidden">
                        {SAMPLE_QUESTIONS.map((question, idx) => (
                          <div
                            key={idx}
                            className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ${
                              idx === currentQuestionIndex
                                ? 'opacity-100 translate-y-0'
                                : idx < currentQuestionIndex
                                ? 'opacity-0 -translate-y-full'
                                : 'opacity-0 translate-y-full'
                            }`}
                          >
                            <p className="text-white font-medium italic">"{question}"</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {!schemaStatus?.indexed && (
                    <p className="text-accent-coral mt-4 font-semibold">
                      ⚠️ Veuillez d'abord indexer la base de données
                    </p>
                  )}
                </div>
              )}

              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-4xl rounded-2xl p-4 ${
                      msg.role === 'user'
                        ? 'bg-white/20 border border-white/30'
                        : msg.error
                        ? 'bg-accent-coral/20 border border-accent-coral/30'
                        : 'bg-white/10 border border-white/20'
                    }`}
                  >
                    <p
                      className={`text-sm font-medium mb-1 ${
                        msg.role === 'user' ? 'text-white/60' : 'text-white/80'
                      }`}
                    >
                      {msg.role === 'user' ? 'Vous' : 'Assistant IA'}
                    </p>
                    <p className="text-white">{msg.content}</p>

                    {msg.sql && (
                      <div className="mt-3">
                        <Button
                          size="xs"
                          variant="subtle"
                          leftSection={<IconCode size={14} />}
                          onClick={() => toggleSql(idx)}
                          style={{
                            color: '#4FC7BA',
                          }}
                        >
                          {msg.showSql ? 'Masquer' : 'Voir'} la requête SQL
                        </Button>
                        <Collapse in={!!msg.showSql}>
                          <div className="mt-2 bg-black/30 rounded-lg p-3 border border-white/10">
                            <code className="text-sm text-accent-teal font-mono whitespace-pre-wrap break-all">
                              {msg.sql}
                            </code>
                          </div>
                        </Collapse>
                      </div>
                    )}

                    {msg.data !== undefined && (
                      <div className="mt-3">
                        {msg.data.length === 0 ? (
                          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                            <p className="text-white/60 text-sm italic">
                              Aucun résultat trouvé pour cette requête.
                            </p>
                          </div>
                        ) : (
                          <>
                            <div className="flex justify-between items-center mb-2">
                              <p className="text-xs text-white/60">
                                {msg.data.length} résultat{msg.data.length > 1 ? 's' : ''}
                              </p>
                              <Button
                                size="xs"
                                variant="subtle"
                                leftSection={<IconDownload size={14} />}
                                onClick={() => exportToCSV(msg.data!)}
                                style={{
                                  color: '#FFAB4D',
                                }}
                              >
                                Exporter CSV
                              </Button>
                            </div>
                            <div className="bg-white/5 rounded-lg p-3 border border-white/10 overflow-x-auto">
                              <Table
                                horizontalSpacing="sm"
                                verticalSpacing="xs"
                                style={{
                                  color: 'white',
                                }}
                              >
                                <Table.Thead>
                                  <Table.Tr>
                                    {Object.keys(msg.data[0]).map((key) => (
                                      <Table.Th key={key} style={{ color: '#4FC7BA', fontWeight: 600 }}>
                                        {key}
                                      </Table.Th>
                                    ))}
                                  </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                  {msg.data.map((row, rowIdx) => (
                                    <Table.Tr key={rowIdx}>
                                      {Object.values(row).map((val: any, colIdx) => (
                                        <Table.Td key={colIdx} style={{ color: 'white' }}>
                                          {val?.toString() || '-'}
                                        </Table.Td>
                                      ))}
                                    </Table.Tr>
                                  ))}
                                </Table.Tbody>
                              </Table>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white/10 border border-white/20 rounded-2xl p-4">
                    <Loader size="sm" color="white" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-white/20 p-4 bg-white/5">
              <div className="flex gap-3">
                <TextInput
                  placeholder={
                    schemaStatus?.indexed
                      ? 'Posez votre question sur la base de données...'
                      : 'Indexez d\'abord la base de données'
                  }
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  disabled={!schemaStatus?.indexed || loading}
                  className="flex-1"
                  size="lg"
                  styles={{
                    input: {
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      color: 'white',
                      '&::placeholder': {
                        color: 'rgba(255, 255, 255, 0.4)',
                      },
                    },
                  }}
                />
                <ActionIcon
                  size={48}
                  onClick={handleSendMessage}
                  disabled={!input.trim() || !schemaStatus?.indexed || loading}
                  style={{
                    background: input.trim() && schemaStatus?.indexed ? '#4FC7BA' : 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                  }}
                >
                  <IconSend size={20} color="white" />
                </ActionIcon>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
