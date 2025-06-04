import { render, screen, fireEvent, within } from '@testing-library/react'
import { describe, test, expect, vi, beforeEach } from 'vitest'
import { DateRangePicker } from '@/components/dashboard/date-range-picker'
import { addDays } from 'date-fns'

// Mock icons
vi.mock("lucide-react", () => ({
  CalendarIcon: () => <span data-testid="calendar-icon" />
}))

// Mock cn utility
vi.mock("@/lib/utils", () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(" ")
}))

// Create clean mocks for the UI components
const mockTriggerFn = vi.fn()
const mockContentFn = vi.fn()
const mockPopoverFn = vi.fn()
const mockButtonFn = vi.fn()
const mockCalendarFn = vi.fn()

// Mock Button component
vi.mock("@/components/ui/button", () => ({
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
vi.mock("@/components/ui/popover", () => ({
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
vi.mock("@/components/ui/calendar", () => ({
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
    vi.clearAllMocks()
  })

  test('should display selected date range', async () => {
    // 使用 本地 日期，避免因时区导致的渲染差异 (Use local date to avoid rendering differences due to timezones)
    const startDate = new Date(2024, 0, 1); // Changed from Date.UTC to local date
    const endDate = addDays(startDate, 7);

    render(
      <DateRangePicker
        dateRange={{ from: startDate, to: endDate }}
        onDateRangeChange={vi.fn()}
      />
    );

    // Verify that the button displays the formatted date range
    const dateButton = await screen.findByTestId('date-button');
    // Use a regex to handle potential text splitting around the hyphen
    expect(await within(dateButton).findByText(/Jan 01, 2024\s*-\s*Jan 08, 2024/)).toBeInTheDocument();
  })

  test('should display only start date when no end date is selected', async () => {
    const startDate = new Date(2024, 0, 1);

    render(
      <DateRangePicker
        dateRange={{ from: startDate, to: undefined }}
        onDateRangeChange={vi.fn()}
      />
    )
    const dateButton = await screen.findByTestId('date-button')
    expect(await within(dateButton).findByText('Jan 01, 2024')).toBeInTheDocument()
  })

  test('should display placeholder when no date is selected', async () => {
    render(
      <DateRangePicker
        dateRange={{ from: undefined, to: undefined }}
        onDateRangeChange={vi.fn()}
      />
    )
    const dateButton = await screen.findByTestId('date-button')
    expect(await within(dateButton).findByText('Pick a date range')).toBeInTheDocument()
  })

  test('should pass correct props to Calendar component', () => {
    const dateRange = {
      from: new Date(Date.UTC(2024, 0, 1)),
      to: new Date(Date.UTC(2024, 0, 10))
    }
    const onChangeMock = vi.fn()

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
    const onChangeMock = vi.fn()

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
    const onChangeMock = vi.fn()

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
