/**
 * expression.ts — a small, self-contained arithmetic evaluator.
 *
 * The calculators previously used `eval()`. That is unsafe, and Hermes (the
 * engine React Native ships with) refuses to run it in release builds, so every
 * "=" press silently produced "Error". This is a proper tokeniser +
 * shunting-yard parser: no eval, correct precedence, correct unary minus, and
 * it reports *why* an expression is invalid.
 */

export type EvalResult =
  | { ok: true; value: number }
  | { ok: false; error: string };

// Display glyphs → canonical operators
const NORMALISE: Record<string, string> = {
  '÷': '/',
  '×': '*',
  '−': '-',
  '–': '-',
  '—': '-',
  ',': '',
  ' ': '',
};

type Token =
  | { type: 'num'; value: number }
  | { type: 'op'; value: string }
  | { type: 'lparen' }
  | { type: 'rparen' };

const PRECEDENCE: Record<string, number> = {
  '+': 1,
  '-': 1,
  '*': 2,
  '/': 2,
  '%': 2,     // modulo (only reachable via explicit 'mod' input; UI uses percent-of)
  'u-': 3,    // unary minus
  '^': 4,     // power
};

const RIGHT_ASSOC = new Set(['^', 'u-']);

function normalise(input: string): string {
  let out = '';
  for (const ch of input) {
    out += ch in NORMALISE ? NORMALISE[ch] : ch;
  }
  // `**` is accepted as an alias for `^` (the scientific keypad emits it)
  return out.replace(/\*\*/g, '^');
}

function tokenise(input: string): Token[] | string {
  const src = normalise(input);
  const tokens: Token[] = [];
  let i = 0;

  const prev = () => tokens[tokens.length - 1];
  const prevIsValue = () => {
    const p = prev();
    return !!p && (p.type === 'num' || p.type === 'rparen');
  };

  while (i < src.length) {
    const ch = src[i];

    if (ch >= '0' && ch <= '9') {
      let j = i;
      let seenDot = false;
      while (j < src.length) {
        const c = src[j];
        if (c >= '0' && c <= '9') { j++; continue; }
        if (c === '.' && !seenDot) { seenDot = true; j++; continue; }
        // Scientific notation: 1e5, 2.5e-3
        if ((c === 'e' || c === 'E') && j + 1 < src.length) {
          const next = src[j + 1];
          const nextNext = src[j + 2];
          if (next >= '0' && next <= '9') { j += 2; continue; }
          if ((next === '-' || next === '+') && nextNext >= '0' && nextNext <= '9') { j += 3; continue; }
        }
        break;
      }
      const raw = src.slice(i, j);
      const value = parseFloat(raw);
      if (isNaN(value)) return `Malformed number "${raw}"`;
      // Implicit multiplication: 2(3) → 2*3
      if (prevIsValue()) tokens.push({ type: 'op', value: '*' });
      tokens.push({ type: 'num', value });
      i = j;
      continue;
    }

    if (ch === '.') {
      // Leading-dot decimal: ".5"
      let j = i + 1;
      while (j < src.length && src[j] >= '0' && src[j] <= '9') j++;
      if (j === i + 1) return 'Stray decimal point';
      if (prevIsValue()) tokens.push({ type: 'op', value: '*' });
      tokens.push({ type: 'num', value: parseFloat(src.slice(i, j)) });
      i = j;
      continue;
    }

    if (ch === '(') {
      if (prevIsValue()) tokens.push({ type: 'op', value: '*' });
      tokens.push({ type: 'lparen' });
      i++;
      continue;
    }

    if (ch === ')') {
      tokens.push({ type: 'rparen' });
      i++;
      continue;
    }

    if (ch === '+' || ch === '-' || ch === '*' || ch === '/' || ch === '^') {
      if (ch === '-' && !prevIsValue()) {
        tokens.push({ type: 'op', value: 'u-' });
      } else if (ch === '+' && !prevIsValue()) {
        // Unary plus is a no-op
      } else {
        tokens.push({ type: 'op', value: ch });
      }
      i++;
      continue;
    }

    return `Unexpected character "${ch}"`;
  }

  return tokens;
}

function applyOp(op: string, stack: number[]): string | null {
  if (op === 'u-') {
    if (stack.length < 1) return 'Incomplete expression';
    stack.push(-(stack.pop() as number));
    return null;
  }
  if (stack.length < 2) return 'Incomplete expression';
  const b = stack.pop() as number;
  const a = stack.pop() as number;
  switch (op) {
    case '+': stack.push(a + b); break;
    case '-': stack.push(a - b); break;
    case '*': stack.push(a * b); break;
    case '/':
      if (b === 0) return "Can't divide by zero";
      stack.push(a / b);
      break;
    case '%':
      if (b === 0) return "Can't divide by zero";
      stack.push(a % b);
      break;
    case '^': stack.push(Math.pow(a, b)); break;
    default: return `Unknown operator "${op}"`;
  }
  return null;
}

/** Evaluate an infix arithmetic expression. Never throws. */
export function evaluateExpression(input: string): EvalResult {
  if (!input.trim()) return { ok: false, error: 'Empty expression' };

  const tokens = tokenise(input);
  if (typeof tokens === 'string') return { ok: false, error: tokens };
  if (tokens.length === 0) return { ok: false, error: 'Empty expression' };

  const values: number[] = [];
  const ops: string[] = [];
  let depth = 0;

  for (const token of tokens) {
    if (token.type === 'num') {
      values.push(token.value);
    } else if (token.type === 'lparen') {
      ops.push('(');
      depth++;
    } else if (token.type === 'rparen') {
      if (depth === 0) return { ok: false, error: 'Unbalanced brackets' };
      while (ops.length && ops[ops.length - 1] !== '(') {
        const err = applyOp(ops.pop() as string, values);
        if (err) return { ok: false, error: err };
      }
      ops.pop(); // discard '('
      depth--;
    } else {
      const op = token.value;
      while (
        ops.length &&
        ops[ops.length - 1] !== '(' &&
        (PRECEDENCE[ops[ops.length - 1]] > PRECEDENCE[op] ||
          (PRECEDENCE[ops[ops.length - 1]] === PRECEDENCE[op] && !RIGHT_ASSOC.has(op)))
      ) {
        const err = applyOp(ops.pop() as string, values);
        if (err) return { ok: false, error: err };
      }
      ops.push(op);
    }
  }

  if (depth !== 0) return { ok: false, error: 'Unbalanced brackets' };

  while (ops.length) {
    const op = ops.pop() as string;
    if (op === '(') return { ok: false, error: 'Unbalanced brackets' };
    const err = applyOp(op, values);
    if (err) return { ok: false, error: err };
  }

  if (values.length !== 1) return { ok: false, error: 'Incomplete expression' };

  const value = values[0];
  if (!isFinite(value)) return { ok: false, error: 'Result out of range' };
  return { ok: true, value };
}

/**
 * Render a computed number for a calculator display: up to 12 significant
 * digits, no trailing zeros, scientific notation only when unavoidable.
 */
export function formatResult(n: number): string {
  if (!isFinite(n) || isNaN(n)) return 'Error';
  if (n === 0) return '0';

  const abs = Math.abs(n);
  if (abs >= 1e12 || abs < 1e-9) {
    return n.toExponential(6).replace(/\.?0+e/, 'e');
  }
  // 12 significant digits, then strip the float noise
  const rounded = parseFloat(n.toPrecision(12));
  return String(rounded);
}

/** True when the last non-space character is a binary operator. */
export function endsWithOperator(expr: string): boolean {
  return /[+\-*/^÷×−]$/.test(expr.trimEnd());
}

/**
 * Append a token to an expression, replacing a trailing operator instead of
 * stacking a second one ("5+" + "×" → "5×") and refusing a second decimal
 * point in the current number ("1.5" + "." → "1.5").
 */
export function appendToken(expr: string, token: string): string {
  const OPERATORS = ['÷', '×', '−', '+', '^'];

  if (OPERATORS.includes(token)) {
    if (!expr) return expr; // nothing to operate on yet
    if (endsWithOperator(expr)) return expr.slice(0, -1) + token;
    return expr + token;
  }

  if (token === '.') {
    // Find the number currently being typed
    const currentNumber = expr.split(/[÷×−+^()]/).pop() ?? '';
    if (currentNumber.includes('.')) return expr;
    if (currentNumber === '') return expr + '0.';
    return expr + '.';
  }

  // Avoid runs of leading zeros: "0" + "5" → "5"
  if (/\d/.test(token)) {
    const currentNumber = expr.split(/[÷×−+^()]/).pop() ?? '';
    if (currentNumber === '0') return expr.slice(0, -1) + token;
  }

  return expr + token;
}
