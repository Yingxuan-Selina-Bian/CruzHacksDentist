// --- 1. SMART CHATBOT (OpenAI based) ---
// File: src/components/SmartChatbot.jsx
'use client'

import { useState } from 'react'

export default function SmartChatbot() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const sendMessage = async () => {
    if (!input.trim()) return
    const newMessages = [...messages, { from: 'user', text: input }]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    const res = await fetch('/api/generate-summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: input })
    })

    const data = await res.json()
    setMessages([...newMessages, { from: 'bot', text: data.result || 'Sorry, I couldn’t answer that.' }])
    setLoading(false)
  }}
