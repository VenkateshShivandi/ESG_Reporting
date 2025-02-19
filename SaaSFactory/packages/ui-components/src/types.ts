export interface LoadingProps {
  isLoading?: boolean;
  error?: string;
  retry?: () => void;
}

export interface QuoteTableProps extends LoadingProps {
  customerName: string;
  company: string;
  items: {
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  total: number;
  summary: string;
}

export interface MessageProps {
  role: 'user' | 'assistant' | 'system';
  content: string | object;
  className?: string;
  isTyping?: boolean;
  timestamp?: Date;
  avatar?: string;
  status?: 'sent' | 'delivered' | 'read';
}