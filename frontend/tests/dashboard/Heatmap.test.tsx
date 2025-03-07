import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { Heatmap } from '@/components/dashboard/heatmap'

const mockData = [
  {
    year: '2023',
    emissions: 80,
    energy: 65,
    water: 90,
    waste: 45
  },
  {
    year: '2022',
    emissions: 75,
    energy: 60,
    water: 85,
    waste: 40
  }
]

describe('Heatmap', () => {
  test('renders the heatmap with correct data', () => {
    render(<Heatmap data={mockData} />)

    // Test column headers
    expect(screen.getByText('Year')).toBeInTheDocument()
    expect(screen.getByText('emissions')).toBeInTheDocument()
    expect(screen.getByText('energy')).toBeInTheDocument()
    expect(screen.getByText('water')).toBeInTheDocument()
    expect(screen.getByText('waste')).toBeInTheDocument()

    // Test year labels
    expect(screen.getByText('2023')).toBeInTheDocument()
    expect(screen.getByText('2022')).toBeInTheDocument()

    // Test data values are displayed
    expect(screen.getByText('80')).toBeInTheDocument()
    expect(screen.getByText('65')).toBeInTheDocument()
    expect(screen.getByText('90')).toBeInTheDocument()
    expect(screen.getByText('45')).toBeInTheDocument()
  })

  test('renders the impact scale legend', () => {
    render(<Heatmap data={mockData} />)

    expect(screen.getByText('Low Impact')).toBeInTheDocument()
    expect(screen.getByText('High Impact')).toBeInTheDocument()
  })
})
