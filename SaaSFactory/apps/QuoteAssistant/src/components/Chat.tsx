import React, { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import { log } from '../logger';
import jsPDF from 'jspdf';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import '../App.css';
import DOMPurify from 'dompurify';

interface ChatProps {
  user: User;
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string | object;
}

interface QuoteItem {
  image: string;
  product_code: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface QuoteData {
  customer_name: string;
  company: string;
  phone_number: string;
  items: QuoteItem[];
  subtotal: number;
  sales_tax: number;
  shipping: number;
  total_cost: number;
  summary: string;
}

const Chat: React.FC<ChatProps> = ({ user }) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Tell us what Sun-of-a-Peach can do for you today?" }
  ]);
  const [input, setInput] = useState("");
  const [threadId, setThreadId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [quoteReady, setQuoteReady] = useState(false);
  const [quoteData, setQuoteData] = useState<QuoteData | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const renderQuoteDetails = (content: string | object) => {
    if (typeof content === 'object') {
      content = JSON.stringify(content, null, 2);
    }
    return <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }} />;
  };

  const renderMessage = (content: string | object) => {
    if (typeof content === 'object') {
      return 'Download Below'; // Replace JSON display with this message
    }
    if (typeof content === 'string') {
      // Handle quote data
      if (content.includes('QUOTE_DATA_START')) {
        const quoteDataMatch = content.match(/QUOTE_DATA_START([\s\S]*?)QUOTE_DATA_END/);
        if (quoteDataMatch) {
          try {
            const quoteData = JSON.parse(quoteDataMatch[1]);
            setQuoteData(quoteData);
            setQuoteReady(true);
            content = content.replace(/QUOTE_DATA_START[\s\S]*?QUOTE_DATA_END/, 'Download Below');
          } catch (error) {
            console.error('Error parsing quote data:', error);
          }
        }
        content = content.replace(/QUOTE_DATA_START[\s\S]*?QUOTE_DATA_END/, '');
      }
      
      // Convert newlines to <br> tags
      content = content.replace(/\n/g, '<br>');
      
      // Convert bullet points to HTML list
      content = content.replace(/^([-•*])\s(.+)$/gm, '<li>$2</li>');
      content = content.replace(/<li>(.+?)<\/li>/g, '<ul><li>$1</li></ul>');
      
      // Wrap the content in a div
      content = `<div class="message-content">${content}</div>`;
    }
    return renderQuoteDetails(content);
  };

  useEffect(() => {
    const startConversation = async () => {
      try {
        const token = await user.getIdToken(true);
        console.log('Token length:', token.length);
        console.log('Token first 20 characters:', token.substring(0, 20));
        console.log('Token last 20 characters:', token.substring(token.length - 20));
        
        const response = await fetch("/api/start", {
          method: "GET",
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });
        
        console.log('Start conversation response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
          const errorText = await response.text();
          console.log('Full error response:', errorText);
          throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        const data = await response.json();
        console.log('Start conversation response data:', data);
        setThreadId(data.thread_id);
      } catch (error) {
        console.error("Failed to start conversation:", error);
        setMessages([{
          role: 'system',
          content: 'Failed to start conversation. Please try refreshing the page.'
        }]);
      }
    };

    startConversation();
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !threadId) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const token = await user.getIdToken();
      console.log('Token retrieved:', token.substring(0, 10) + '...');
      console.log('Sending message:', input);
      console.log('Thread ID:', threadId);
      const response = await fetch("/api/chat", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ thread_id: threadId, message: input }),
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Received data:', data);

      let assistantMessage: Message;
      if (data.quote_data) {
        assistantMessage = {
          role: 'assistant',
          content: data.quote_data
        };
      } else {
        assistantMessage = { role: 'assistant', content: data.response };
      }
      setMessages((prevMessages) => [...prevMessages, assistantMessage]);
      setIsLoading(false);
      log('info', `Received response: ${data.response}`);

      if (data.quote_data) {
        console.log("Quote data received:", data.quote_data);
      }

      if (data.quote_ready) {
        setQuoteReady(true);
        if (data.quote_data) {
          setQuoteData(data.quote_data);
        }
      }

      if (data.pdf_data) {
        // Automatically download the PDF
        const pdfBlob = base64ToBlob(data.pdf_data, 'application/pdf');
        const url = window.URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = 'quote.pdf';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        console.log('PDF downloaded automatically');
      }
    } catch (error) {
      console.error('Error in chat:', error);
      log('error', `Error in chat: ${error instanceof Error ? error.message : String(error)}`);
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          role: 'system',
          content: `Sorry, there was an error processing your request: ${error instanceof Error ? error.message : String(error)}`
        }
      ]);
      setIsLoading(false);
    }
  };

  const handleNewMessage = async (message: string) => {
    try {
      const response = await fetch('/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.getIdToken()}`
        },
        body: JSON.stringify({ message: message }),
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(prevMessages => [...prevMessages, { role: 'assistant', content: data.response }]);
        
        // Check if the quote is ready for download
        if (data.quote_ready) {
          handleDownloadPDF();
        }
      } else {
        console.error('Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!quoteData) {
      console.error('No quote data available');
      return;
    }

    try {
      setIsDownloading(true);
      const response = await fetch('/api/generate-quote-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user.getIdToken()}`
        },
        body: JSON.stringify({ quote_data: quoteData }),
      });
      
      if (response.ok) {
        const data = await response.json();
        const blob = base64ToBlob(data.pdf_data, 'application/pdf');
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = 'quote.pdf';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        console.log('PDF downloaded successfully');
      } else {
        throw new Error('Failed to generate PDF');
      }
    } catch (error) {
      console.error('Error generating or downloading PDF:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  // Helper function to convert base64 to Blob
  function base64ToBlob(base64: string, mimeType: string) {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }

  return (
    <div className="flex flex-col h-screen bg-[#FAB931]">
      <header className="bg-[#F24D6C] shadow-md p-4 flex justify-between items-center">
        <div className="text-white">
          <p>Welcome,</p>
          <p>{user.email}</p>
        </div>
        <h1 className="text-3xl font-bold text-white absolute left-1/2 transform -translate-x-1/2">Quote Assistant</h1>
        <button
          onClick={handleSignOut}
          className="bg-[#F8912E] hover:bg-[#FEE846] text-white font-bold py-2 px-4 rounded"
        >
          Sign Out
        </button>
      </header>
      <div className="flex-grow overflow-y-auto p-4 space-y-4 flex flex-col">
        <div className="flex justify-center items-center flex-grow">
          <img src="/static/logo.png" alt="Logo" className="h-64" />
        </div>
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[70%] rounded-lg p-3 shadow-md ${
                  message.role === 'assistant' ? 'bg-[#FEE846] text-black' : 'bg-white text-black'
                }`}
              >
                {renderMessage(message.content)}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
          {quoteReady && quoteData && (
            <div className="flex justify-center mt-4">
              <button
                onClick={handleDownloadPDF}
                className="bg-[#F8912E] hover:bg-[#FEE846] text-white font-bold py-2 px-4 rounded"
                disabled={isDownloading}
              >
                {isDownloading ? 'Downloading...' : 'Download Quote PDF'}
              </button>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-[#F24D6C] p-4">
        <div className="flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-grow mr-2 p-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#FAB931]"
            disabled={isLoading}
          />
          <button
            type="submit"
            className="bg-[#F8912E] text-white font-bold py-2 px-4 rounded-lg hover:bg-[#FEE846] hover:text-[#F24D6C] focus:outline-none focus:ring-2 focus:ring-[#FAB931] disabled:opacity-50"
            disabled={isLoading}
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
};

export default Chat;