import React from 'react';

interface QuoteTableProps {
  data: any[];
  error?: boolean;
  onRetry?: () => void;
  columns?: {
    header: string;
    accessor: string;
  }[];
}

export const QuoteTable: React.FC<QuoteTableProps> = ({
  data,
  error = false,
  onRetry,
  columns = []
}) => {
  if (error) {
    return (
      <div>
        <p>Error loading data</p>
        {onRetry && (
          <button onClick={onRetry}>Retry</button>
        )}
      </div>
    );
  }

  return (
    <table>
      <thead>
        <tr>
          {columns.map((column, index) => (
            <th key={index}>{column.header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, rowIndex) => (
          <tr key={rowIndex}>
            {columns.map((column, colIndex) => (
              <td key={colIndex}>{row[column.accessor]}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default QuoteTable;