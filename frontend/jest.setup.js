// Import custom jest matchers from jest-dom
import '@testing-library/jest-dom' 
import ResizeObserver from 'resize-observer-polyfill';

process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test_anon_key';

global.ResizeObserver = ResizeObserver;
global.TransformStream = require('web-streams-polyfill').TransformStream;

global.IntersectionObserver = class {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
};