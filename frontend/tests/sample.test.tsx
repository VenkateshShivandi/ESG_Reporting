import React from "react"
import { render } from "@testing-library/react"
import Home from "@/app/page"

// tests/fe-tests/sample.test.tsx
test('basic math works', () => {
  expect(1 + 1).toBe(2);
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

