'use client'

import { useState, useRef, useEffect } from 'react'
import { useChat } from 'ai/react'
import { Send, Loader2 } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"

const ChatPage = () => {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [showWelcome, setShowWelcome] = useState(true)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    if (messages.length > 0) {
      setShowWelcome(false)
    }
  }, [messages])

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    handleSubmit(e)
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <Card className="flex flex-col h-full pl-12">
        <CardHeader>
          <CardTitle>ESG Analytics Chat</CardTitle>
        </CardHeader>
        <CardContent className="flex-grow overflow-hidden">
          <ScrollArea className="h-full pr-4">
            {showWelcome && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <h2 className="text-2xl font-bold mb-2">Welcome to ESG Analytics Chat</h2>
                  <p className="text-gray-600">Ask questions about your ESG data and reports.</p>
                </div>
              </div>
            )}
            {messages.map(m => (
              <div key={m.id} className={`mb-4 ${m.role === 'user' ? 'text-right' : 'text-left'}`}>
                <span className={`inline-block p-2 rounded-lg ${
                  m.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-black'
                }`}>
                  {m.content}
                </span>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </ScrollArea>
        </CardContent>
        <CardFooter>
          <form onSubmit={onSubmit} className="flex w-full space-x-2">
            <Input
              value={input}
              onChange={handleInputChange}
              placeholder="Ask about your ESG data..."
              className="flex-grow"
            />
            <Button type="submit" disabled={isLoading}>
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  )
}

export default ChatPage