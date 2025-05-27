// frontend/vitest.setup.ts
import { vi } from 'vitest';
vi.mock('@/lib/supabase/client');
import '@testing-library/jest-dom';