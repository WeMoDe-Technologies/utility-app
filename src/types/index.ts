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
  icon: string; // @expo/vector-icons name
  iconFamily:
    | 'Ionicons'
    | 'MaterialCommunityIcons'
    | 'FontAwesome5'
    | 'Feather'
    | 'AntDesign';
  route: string;
  category: UtilityCategory;
  color: string; // accent color
  supportsPersistence: boolean;
  supportsHistory: boolean;
  supportsFavourite: boolean;
}

// ─── State Management Types ───────────────────────────────────────────────
export interface RecentEntry {
  utilityId: string;
  lastUsedAt: number; // timestamp
  useCount: number;
}

export interface FavouritesState {
  ids: string[];
  addFavourite: (id: string) => void;
  removeFavourite: (id: string) => void;
  isFavourite: (id: string) => boolean;
  toggleFavourite: (id: string) => void;
}

export interface RecentsState {
  entries: RecentEntry[];
  recordUsage: (id: string) => void;
  clearRecent: () => void;
  getRecent: (limit?: number) => RecentEntry[];
}

export interface PreferencesState {
  theme: 'light' | 'dark' | 'system';
  hapticFeedback: boolean;
  showUsageCount: boolean;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setHapticFeedback: (enabled: boolean) => void;
  setShowUsageCount: (show: boolean) => void;
}

// ─── Utility-Specific State Types ─────────────────────────────────────────
export interface CalculatorState {
  expression: string;
  result: string;
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
  workDuration: number; // minutes
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

export interface ScientificCalculatorState {
  expression: string;
  result: string;
  isRadians: boolean;
  history: Array<{ expression: string; result: string; timestamp: number }>;
}

// ─── Generic Utility Cache ─────────────────────────────────────────────────
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

export type UtilityId = keyof UtilityStateMap;
