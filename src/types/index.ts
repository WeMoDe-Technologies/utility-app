// ─── Utility Registry Types ───────────────────────────────────────────────
export type UtilityCategory =
  | 'math'
  | 'converter'
  | 'finance'
  | 'productivity'
  | 'tools'
  | 'time';

export interface UtilityDefinition {
  id: string;
  title: string;
  description: string;
  icon: string;
  iconFamily: 'Ionicons' | 'MaterialCommunityIcons' | 'MaterialIcons' | 'FontAwesome5' | 'Feather' | 'AntDesign';
  route: string;
  category: UtilityCategory;
  color: string;
  supportsPersistence: boolean;
  supportsHistory: boolean;
  supportsFavourite: boolean;
}

// ─── State Management Types ───────────────────────────────────────────────
export interface RecentEntry {
  utilityId: string;
  lastUsedAt: number;
  useCount: number;
}

// ─── Calculator with memory ────────────────────────────────────────────────
export interface CalculatorState {
  display: string;           // what's shown in main display
  expression: string;        // full expression string being built
  result: string;            // last computed result
  memory: number;            // M register value
  hasMemory: boolean;        // whether memory has a stored value
  justEvaluated: boolean;    // true right after pressing =
  history: Array<{
    expression: string;
    result: string;
    timestamp: number;
  }>;
}

export interface ScientificCalculatorState {
  expression: string;
  result: string;
  isRadians: boolean;
  history: Array<{ expression: string; result: string; timestamp: number }>;
}

export interface UnitConverterState {
  category: string;
  fromUnit: string;
  toUnit: string;
  fromValue: string;
  toValue: string;
}

export interface CurrencyConverterState {
  fromCurrency: string;
  toCurrency: string;
  amount: string;
  result: string;
  lastFetchedAt: number | null;
  rates: Record<string, number>;
}

export interface NoteItem {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  isPinned: boolean;
  color: string;
}

export interface NotesState {
  notes: NoteItem[];
  activeNoteId: string | null;
}

export interface PomodoroState {
  workDuration: number;
  breakDuration: number;
  longBreakDuration: number;
  currentPhase: 'work' | 'break' | 'longBreak';
  sessionsCompleted: number;
  isRunning: boolean;
  remainingSeconds: number;
}

export interface StopwatchState {
  isRunning: boolean;
  elapsedMs: number;
  laps: Array<{ id: number; time: number; delta: number }>;
}

export interface WorldClockCity {
  id: string;
  city: string;
  country: string;
  timezone: string;
  offset: number;
}

export interface WorldClockState {
  cities: WorldClockCity[];
}

export interface PasswordGeneratorState {
  length: number;
  includeUppercase: boolean;
  includeLowercase: boolean;
  includeNumbers: boolean;
  includeSymbols: boolean;
  lastGenerated: string;
  history: string[];
}

export interface TextUtilityState {
  input: string;
  activeOperation: string;
}

export interface AgeCalculatorState {
  birthDate: string;
  targetDate: string;
}

export interface DiscountCalculatorState {
  originalPrice: string;
  discountPercent: string;
  result: string;
}

export interface CounterState {
  counters: Array<{
    id: string;
    label: string;
    value: number;
    step: number;
    color: string;
  }>;
}

export interface EMIState {
  principal: string;
  rate: string;
  tenure: string;
  tenureType: 'months' | 'years';
  emi: string;
  totalAmount: string;
  totalInterest: string;
}

export interface GSTState {
  amount: string;
  gstRate: string;
  calculationType: 'exclusive' | 'inclusive';
  cgst: string;
  sgst: string;
  igst: string;
  totalAmount: string;
}

export type UtilityStateMap = {
  calculator: CalculatorState;
  scientificCalculator: ScientificCalculatorState;
  unitConverter: UnitConverterState;
  currencyConverter: CurrencyConverterState;
  notes: NotesState;
  pomodoro: PomodoroState;
  stopwatch: StopwatchState;
  worldClock: WorldClockState;
  passwordGenerator: PasswordGeneratorState;
  textUtility: TextUtilityState;
  ageCalculator: AgeCalculatorState;
  discountCalculator: DiscountCalculatorState;
  counter: CounterState;
  emi: EMIState;
  gst: GSTState;
};

export interface CompassState {
  trueNorth: boolean;
}

export interface Expense {
  id: string;
  date: number;          // Date.now() timestamp
  amount: number;
  note: string;
  category: 'transport' | 'food' | 'shopping' | 'bills' | 'health' | 'other';
  isIncome: boolean;
}
 
export interface ExpenseState {
  expenses: Expense[];
  income: number;        // manual baseline income
  includeBills: boolean;
}

export interface TipState {
  billAmount: string;
  tipPercent: number;
  people: number;
  splitEvenly: boolean;
}
 
export interface ColorPickerState {
  hue: number;         // 0–359
  saturation: number;  // 0–100
  brightness: number;  // 0–100
  palette: string[];   // saved HEX values
}
 
export interface SipState {
  mode: 'sip' | 'lumpsum';
  monthlyAmount: number;
  lumpsum: number;
  rate: number;       // % per annum
  years: number;
}
 
export interface NoiseState {
  minDb: number;
  maxDb: number;
  avgDb: number;
  sampleCount: number;
}
 

export type UtilityId = keyof UtilityStateMap;
