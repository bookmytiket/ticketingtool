/**
 * Chat Widget Component
 * Integrated chatbot for user support
 */

import { useState, useEffect, useRef } from 'react'
import { MessageSquare, X, Send, Paperclip, Minimize2, Maximize2, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'
import { chatbotAPI } from '../services/api'
import { ChatAvatar3D } from './ChatAvatar3D'

export const ChatWidget = () => {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState([])
  const [inputMessage, setInputMessage] = useState('')
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(false)
  const [typing, setTyping] = useState(false)
  const [error, setError] = useState(null)
  const [show3DAvatar, setShow3DAvatar] = useState(true)
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (isOpen && user) {
      // Only initialize if we don't have a session yet
      if (!session) {
        initializeSession()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, user])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const initializeSession = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await chatbotAPI.createSession('web')
      setSession(data.session)
      setMessages(data.messages || [])
    } catch (error) {
      console.error('Failed to initialize chat session', error)
      const errorMessage = error?.message || error?.response?.data?.message || 'Failed to initialize chat'
      setError(errorMessage)
      toast.error(errorMessage)
      // Don't close the chat, allow user to retry
    } finally {
      setLoading(false)
    }
  }

  const sendMessage = async (message = null, attachments = []) => {
    const messageToSend = message || inputMessage
    
    // Don't send if no message and no attachments
    if (!messageToSend?.trim() && attachments.length === 0) {
      return
    }

    // Don't send if already loading
    if (loading) {
      return
    }

    // Ensure session exists
    let currentSession = session
    if (!currentSession) {
      try {
        const sessionData = await chatbotAPI.createSession('web')
        currentSession = sessionData.session
        setSession(currentSession)
        if (sessionData.messages && sessionData.messages.length > 0) {
          setMessages(sessionData.messages)
        }
      } catch (error) {
        console.error('Failed to initialize session', error)
        const errorMessage = error?.message || error?.response?.data?.message || 'Failed to initialize chat session'
        toast.error(errorMessage)
        return
      }
    }

    setLoading(true)
    setTyping(true)

    try {
      const data = await chatbotAPI.sendMessage(messageToSend?.trim() || '', currentSession?.sessionId, attachments)

      // Format messages for display - handle both response formats
      const userMsg = data.userMessage || {
        sender: 'user',
        content: messageToSend || 'File attachment',
        createdAt: new Date(),
      }
      
      const botMsg = data.botMessage || {
        sender: 'bot',
        content: data.content || 'I received your message.',
        createdAt: new Date(),
      }

      const formattedUserMessage = {
        sender: userMsg.sender || 'user',
        content: userMsg.content || messageToSend || 'File attachment',
        createdAt: userMsg.createdAt || new Date(),
        attachments: userMsg.attachments || (attachments.length > 0 ? attachments.map(f => ({ filename: f.name, path: f.name })) : []),
      }

      const formattedBotMessage = {
        sender: botMsg.sender || 'bot',
        content: botMsg.content || data.content || 'I received your message.',
        createdAt: botMsg.createdAt || new Date(),
        quickActions: botMsg.quickActions || data.quickActions || [],
        metadata: botMsg.metadata || data.metadata || {},
      }

      setMessages(prev => [
        ...prev,
        formattedUserMessage,
        formattedBotMessage,
      ])

      setInputMessage('')
      setTyping(false)
    } catch (error) {
      console.error('Failed to send message', error)
      toast.error(error.message || 'Failed to send message')
      setTyping(false)
    } finally {
      setLoading(false)
    }
  }

  const handleQuickAction = async (action) => {
    switch (action) {
      case 'Create Ticket':
      case 'Create Another Ticket':
        // Start ticket creation flow in chat
        await sendMessage('create ticket')
        break
      case 'Check Status':
        await sendMessage('Show all my open tickets')
        break
      case 'Contact Support':
        await sendMessage('I want to speak with a technician')
        break
      case 'FAQ':
        await sendMessage('What are common support questions?')
        break
      default:
        // Handle category/priority selections
        if (['Low', 'Medium', 'High', 'Urgent'].includes(action)) {
          await sendMessage(action.toLowerCase())
        } else {
          await sendMessage(action)
        }
    }
  }

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files)
    if (files.length > 0) {
      sendMessage(null, files)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (inputMessage.trim() && !loading) {
        sendMessage()
      }
    }
  }

  if (!user) return null

  return (
    <>
      {/* Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 bg-primary-600 text-white p-4 rounded-full shadow-lg hover:bg-primary-700 transition-all z-[9998] flex items-center justify-center group"
          aria-label="Open chat"
          style={{
            width: '56px',
            height: '56px',
          }}
        >
          <MessageSquare size={24} />
          <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs rounded-full w-3 h-3 flex items-center justify-center animate-pulse" title="3D Avatar Enabled">
            <span className="w-2 h-2 bg-white rounded-full"></span>
          </span>
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            !
          </span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div
          className={`fixed bottom-6 right-6 bg-white rounded-lg shadow-2xl z-[9999] flex flex-col transition-all ${
            isMinimized ? 'w-80 h-14' : 'w-96 h-[600px] max-h-[600px]'
          }`}
          style={{
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
            maxHeight: 'calc(100vh - 48px)',
          }}
        >
          {/* Header */}
          <div className="bg-primary-600 text-white p-4 rounded-t-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare size={20} />
              <span className="font-semibold">Support Chat</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShow3DAvatar(!show3DAvatar)}
                className="p-1 hover:bg-primary-700 rounded transition-colors"
                aria-label={show3DAvatar ? 'Hide 3D Avatar' : 'Show 3D Avatar'}
                title={show3DAvatar ? 'Hide 3D Avatar' : 'Show 3D Avatar'}
              >
                {show3DAvatar ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1 hover:bg-primary-700 rounded transition-colors"
                aria-label={isMinimized ? 'Maximize' : 'Minimize'}
              >
                {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-primary-700 rounded transition-colors"
                aria-label="Close chat"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Error Banner */}
              {error && (
                <div className="bg-red-50 border-b border-red-200 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-red-800 text-sm">
                    <span>⚠️ {error}</span>
                  </div>
                  <button
                    onClick={initializeSession}
                    className="text-red-600 hover:text-red-800 text-sm font-medium underline"
                  >
                    Retry
                  </button>
                </div>
              )}
              {/* 3D Avatar Section */}
              {show3DAvatar && (
                <div className="h-48 bg-gradient-to-b from-primary-50 to-gray-50 border-b border-gray-200 relative overflow-hidden">
                  <div className="absolute inset-0">
                    <ChatAvatar3D typing={typing} showParticles={true} />
                  </div>
                  <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-black/50 text-white text-xs px-3 py-1 rounded-full">
                    {typing ? 'Thinking...' : 'Online'}
                  </div>
                </div>
              )}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {messages.length === 0 && !loading && !error && (
                  <div className="text-center text-gray-500 py-8">
                    {!show3DAvatar && (
                      <MessageSquare className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                    )}
                    <p>Start a conversation!</p>
                    <p className="text-sm mt-2">I can help you create tickets, check status, and answer questions.</p>
                  </div>
                )}
                {loading && messages.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    <div className="animate-spin mx-auto h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full mb-2"></div>
                    <p>Initializing chat...</p>
                  </div>
                )}

                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        message.sender === 'user'
                          ? 'bg-primary-600 text-white'
                          : message.sender === 'technician'
                          ? 'bg-blue-100 text-blue-900'
                          : 'bg-white text-gray-900 border border-gray-200'
                      }`}
                    >
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="mb-2 space-y-1">
                          {message.attachments.map((att, idx) => (
                            <a
                              key={idx}
                              href={`/api/uploads/${att.path}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm underline block"
                            >
                              📎 {att.filename}
                            </a>
                          ))}
                        </div>
                      )}
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      {message.metadata?.ticketId && (
                        <div className="mt-2 pt-2 border-t border-gray-300">
                          <a
                            href={`/tickets/${message.metadata.ticketId}`}
                            className="text-xs underline"
                          >
                            View Ticket #{message.metadata.ticketId}
                          </a>
                        </div>
                      )}
                      <p className="text-xs opacity-70 mt-1">
                        {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}

                {typing && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-gray-200 rounded-lg p-3">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Quick Actions */}
              {messages.length > 0 && messages[messages.length - 1]?.quickActions && (
                <div className="px-4 py-2 border-t border-gray-200 bg-white">
                  <div className="flex flex-wrap gap-2">
                    {messages[messages.length - 1].quickActions.map((action, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleQuickAction(action)}
                        className="text-xs bg-primary-50 text-primary-700 px-3 py-1 rounded-full hover:bg-primary-100 transition-colors"
                      >
                        {action}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input */}
              <div className="p-4 border-t border-gray-200 bg-white rounded-b-lg">
                <div className="flex items-end gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFileUpload}
                    accept="image/*,.pdf,.doc,.docx"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                    aria-label="Attach file"
                  >
                    <Paperclip size={20} />
                  </button>
                  <textarea
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
                    rows={1}
                    disabled={loading}
                  />
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      console.log('Send button clicked', { inputMessage, loading, session })
                      if (inputMessage.trim() && !loading) {
                        sendMessage()
                      }
                    }}
                    disabled={loading || !inputMessage.trim()}
                    className="bg-primary-600 text-white p-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                    aria-label="Send message"
                    type="button"
                  >
                    <Send size={20} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}

