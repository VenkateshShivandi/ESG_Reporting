import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { DateRangePicker } from '@/components/dashboard/date-range-picker'
import { addDays } from 'date-fns'

// Mock icons
jest.mock("lucide-react", () => ({
  CalendarIcon: () => <span data-testid="calendar-icon" />
}))

// Mock cn utility
jest.mock("@/lib/utils", () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(" ")
}))

// Create clean mocks for the UI components
const mockTriggerFn = jest.fn()
const mockContentFn = jest.fn()
const mockPopoverFn = jest.fn()
const mockButtonFn = jest.fn()
const mockCalendarFn = jest.fn()

// Mock Button component
jest.mock("@/components/ui/button", () => ({
  Button: (props: any) => {
    mockButtonFn(props)
    return (
      <button
        id={props.id}
        className={props.className}
        data-testid="date-button"
      >
        {props.children}
      </button>
    )
  }
}))

// Mock Popover components
jest.mock("@/components/ui/popover", () => ({
  Popover: (props: any) => {
    mockPopoverFn(props)
    return <div data-testid="popover">{props.children}</div>
  },
  PopoverTrigger: (props: any) => {
    mockTriggerFn(props)
    return <div data-testid="popover-trigger">{props.children}</div>
  },
  PopoverContent: (props: any) => {
    mockContentFn(props)
    return <div data-testid="popover-content" className={props.className}>{props.children}</div>
  }
}))

// Mock Calendar component
jest.mock("@/components/ui/calendar", () => ({
  Calendar: (props: any) => {
    mockCalendarFn(props)
    return (
      <div data-testid="calendar" className="mock-calendar">
        <button
          type="button"
          onClick={() => props.onSelect({ from: new Date(Date.UTC(2024, 0, 1)) })}
          data-testid="select-start-date"
        >
          Select start date
        </button>
        <button
          type="button"
          onClick={() => props.onSelect({ from: new Date(Date.UTC(2024, 0, 1)), to: new Date(Date.UTC(2024, 0, 10)) })}
          data-testid="select-date-range"
        >
          Select date range
        </button>
      </div>
    )
  }
}))

describe('DateRangePicker', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('should display selected date range', () => {
    // 使用 UTC 日期，避免因时区导致的渲染差异
    const startDate = new Date(Date.UTC(2024, 0, 1))
    const endDate = addDays(startDate, 7)

    render(
      <DateRangePicker
        dateRange={{ from: startDate, to: endDate }}
        onDateRangeChange={jest.fn()}
      />
    )

    // Verify that the button displays the formatted date range
    expect(screen.getByText('Jan 01, 2024 - Jan 08, 2024')).toBeInTheDocument()
  })

  test('should display only start date when no end date is selected', () => {
    const startDate = new Date(Date.UTC(2024, 0, 1))

    render(
      <DateRangePicker
        dateRange={{ from: startDate, to: undefined }}
        onDateRangeChange={jest.fn()}
      />
    )

    expect(screen.getByText('Jan 01, 2024')).toBeInTheDocument()
  })

  test('should display placeholder when no date is selected', () => {
    render(
      <DateRangePicker
        dateRange={{ from: undefined, to: undefined }}
        onDateRangeChange={jest.fn()}
      />
    )

    expect(screen.getByText('Pick a date range')).toBeInTheDocument()
  })

  test('should pass correct props to Calendar component', () => {
    const dateRange = {
      from: new Date(Date.UTC(2024, 0, 1)),
      to: new Date(Date.UTC(2024, 0, 10))
    }
    const onChangeMock = jest.fn()

    render(
      <DateRangePicker
        dateRange={dateRange}
        onDateRangeChange={onChangeMock}
      />
    )

    // Verify Calendar received the correct props
    expect(mockCalendarFn).toHaveBeenCalledTimes(1)
    expect(mockCalendarFn.mock.calls[0][0]).toMatchObject({
      mode: 'range',
      selected: dateRange,
      defaultMonth: dateRange.from,
      numberOfMonths: 2
    })
  })

  test('should handle selecting start date', () => {
    const onChangeMock = jest.fn()

    render(
      <DateRangePicker
        dateRange={{ from: undefined, to: undefined }}
        onDateRangeChange={onChangeMock}
      />
    )

    // Find and click the start date button in our mocked calendar
    const startDateButton = screen.getByTestId('select-start-date')
    fireEvent.click(startDateButton)

    // Verify onDateRangeChange was called with the correct date
    expect(onChangeMock).toHaveBeenCalledTimes(1)
    const calledWith = onChangeMock.mock.calls[0][0]
    expect(calledWith.from).toBeInstanceOf(Date)
    expect(calledWith.from.toISOString().slice(0, 10)).toBe('2024-01-01')
    expect(calledWith.to).toBeUndefined()
  })

  test('should handle selecting date range', () => {
    const onChangeMock = jest.fn()

    render(
      <DateRangePicker
        dateRange={{ from: undefined, to: undefined }}
        onDateRangeChange={onChangeMock}
      />
    )

    // Find and click the date range button in our mocked calendar
    const dateRangeButton = screen.getByTestId('select-date-range')
    fireEvent.click(dateRangeButton)

    // Verify onDateRangeChange was called with the correct date range
    expect(onChangeMock).toHaveBeenCalledTimes(1)
    const calledWith = onChangeMock.mock.calls[0][0]
    expect(calledWith.from).toBeInstanceOf(Date)
    expect(calledWith.from.toISOString().slice(0, 10)).toBe('2024-01-01')
    expect(calledWith.to).toBeInstanceOf(Date)
    expect(calledWith.to.toISOString().slice(0, 10)).toBe('2024-01-10')
  })
})
