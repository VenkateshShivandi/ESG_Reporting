import { render, screen, fireEvent } from '@testing-library/react'
import { DataTable } from '@/components/dashboard/data-table'

const mockData = [
  { id: '1', metric: 'A', current: 90, previous: 80, change: 12.5, status: 'improved' as const },
  { id: '2', metric: 'B', current: 70, previous: 75, change: -6.7, status: 'declined' as const }
]

describe('DataTable', () => {
  test('should sort numeric columns correctly', () => {
    render(<DataTable data={mockData} />)

    // 测试当前值排序
    const currentHeader = screen.getByText('Current')
    fireEvent.click(currentHeader)

    const currentValues = screen.getAllByText(/(90.0|70.0)/)
    expect(currentValues[0]).toHaveTextContent('70.0')
    expect(currentValues[1]).toHaveTextContent('90.0')
  })

  test('should display correct status colors', () => {
    render(<DataTable data={mockData} />)

    const improvedCell = screen.getByText('+12.50%')
    const declinedCell = screen.getByText('-6.70%')

    expect(improvedCell).toHaveClass('text-green-500')
    expect(declinedCell).toHaveClass('text-red-500')
  })
}) 