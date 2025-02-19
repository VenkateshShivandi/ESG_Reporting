// tests/fe-tests/sample.test.tsx

import React from 'react';
import { render, screen } from '@testing-library/react';

const SampleComponent: React.FC = () => <div>Hello, World!</div>;

test('renders the correct content', () => {
  render(<SampleComponent />);
  expect(screen.getByText('Hello, World!')).toBeInTheDocument();
});