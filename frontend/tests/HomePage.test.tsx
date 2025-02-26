import React from "react"
import { render } from "@testing-library/react"
import Home from "@/app/page"

// Add this mock at the top of the test file
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

describe("Home Page", () => {
  it("renders without crashing", () => {
    const { container } = render(<Home />)
    // Check that the rendered content exists, ensuring the component renders correctly.
    expect(container).toBeInTheDocument()
  })

  it("matches the snapshot", () => {
    const { container } = render(<Home />)
    // Snapshot test to ensure the component output matches the expected snapshot.
    expect(container).toMatchSnapshot()
  })
})

