import type {
  ApiEnvelope,
  ApiError,
  GuessRequest,
  GuessResponse,
  HealthResponse,
  Language,
  PuzzleResponse,
} from '@/types/api';

const BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '');

export class ApiClientError extends Error {
  readonly status: number;
  readonly apiError: ApiError;
  readonly retryAfterSeconds?: number;

  constructor(status: number, apiError: ApiError, retryAfterSeconds?: number) {
    super(apiError.message ?? apiError.code);
    this.status = status;
    this.apiError = apiError;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

async function unwrap<T>(res: Response): Promise<T> {
  let body: ApiEnvelope<T>;
  try {
    body = (await res.json()) as ApiEnvelope<T>;
  } catch {
    throw new ApiClientError(res.status, {
      code: 'INTERNAL',
      message: `Non-JSON response (${res.status})`,
    });
  }
  if (!res.ok || body.error) {
    const retryAfter = res.headers.get('Retry-After');
    const apiError: ApiError = body.error ?? {
      code: 'INTERNAL',
      message: `HTTP ${res.status}`,
    };
    throw new ApiClientError(
      res.status,
      apiError,
      retryAfter ? Number(retryAfter) : undefined
    );
  }
  return body.data as T;
}

function url(path: string): string {
  return `${BASE}${path}`;
}

function jsonInit(method: 'GET' | 'POST', body?: unknown): RequestInit {
  return {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Request-Id': crypto.randomUUID(),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  };
}

export const api = {
  health(): Promise<HealthResponse> {
    return fetch(url('/api/health'), jsonInit('GET')).then(unwrap<HealthResponse>);
  },

  todayPuzzle(lang: Language): Promise<PuzzleResponse> {
    return fetch(url(`/api/puzzles/today?lang=${encodeURIComponent(lang)}`), jsonInit('GET'))
      .then(unwrap<PuzzleResponse>);
  },

  practicePuzzle(lang: Language, excludeRecent: string[] = []): Promise<PuzzleResponse> {
    return fetch(url('/api/puzzles/practice'), jsonInit('POST', { lang, excludeRecent }))
      .then(unwrap<PuzzleResponse>);
  },

  guess(req: GuessRequest): Promise<GuessResponse> {
    return fetch(url('/api/guess'), jsonInit('POST', req)).then(unwrap<GuessResponse>);
  },
};
