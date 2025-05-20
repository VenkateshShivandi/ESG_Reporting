// Import custom jest matchers from jest-dom
import '@testing-library/jest-dom' 
import ResizeObserver from 'resize-observer-polyfill';

global.ResizeObserver = ResizeObserver;
global.TransformStream = require('web-streams-polyfill').TransformStream;

global.IntersectionObserver = class {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
};