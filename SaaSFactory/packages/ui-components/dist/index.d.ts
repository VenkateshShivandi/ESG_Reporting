import React from 'react';

interface LoadingProps {
    isLoading?: boolean;
    error?: string;
    retry?: () => void;
}
interface QuoteTableProps$1 extends LoadingProps {
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
interface MessageProps {
    role: 'user' | 'assistant' | 'system';
    content: string | object;
    className?: string;
    isTyping?: boolean;
    timestamp?: Date;
    avatar?: string;
    status?: 'sent' | 'delivered' | 'read';
}

interface QuoteTableProps {
    data: any[];
    error?: boolean;
    onRetry?: () => void;
    columns?: {
        header: string;
        accessor: string;
    }[];
}
declare const QuoteTable: React.FC<QuoteTableProps>;

declare const Message: React.FC<MessageProps>;

export { LoadingProps, Message, MessageProps, QuoteTable, QuoteTableProps$1 as QuoteTableProps };
