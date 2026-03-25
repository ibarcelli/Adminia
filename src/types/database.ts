// Enums

export type BankAccountType = 'own' | 'adminia'

export type PeriodStatus = 'draft' | 'published' | 'closed'

export type ExpenseCategory = 'fixed' | 'variable' | 'water'

export type StatementStatus = 'pending' | 'paid' | 'partial' | 'overdue'

export type MatchStatus = 'unmatched' | 'suggested' | 'confirmed' | 'rejected'

export type UserRole = 'admin' | 'condo'

// Tables

export interface Organization {
  id: string
  name: string
  created_at: string
}

export interface Building {
  id: string
  organization_id: string
  name: string
  address: string
  total_units: number
  bank_account_type: BankAccountType
  bank_account_name: string
  payment_deadline_day: number
  created_at: string
}

export interface Unit {
  id: string
  building_id: string
  unit_number: string
  area_sqm: number
  owner_name: string
  owner_email: string
  owner_phone: string | null
  is_active: boolean
  created_at: string
}

export interface User {
  id: string
  email: string
  role: UserRole
  organization_id: string | null
  unit_id: string | null
  created_at: string
}

export interface Period {
  id: string
  building_id: string
  year: number
  month: number
  water_reading_previous: number
  water_reading_current: number
  water_total_cost: number
  status: PeriodStatus
  published_at: string | null
  created_at: string
}

export interface Expense {
  id: string
  period_id: string
  concept: string
  amount: number
  category: ExpenseCategory
  created_at: string
}

export interface Statement {
  id: string
  period_id: string
  unit_id: string
  water_charge: number
  expenses_charge: number
  previous_balance: number
  total_due: number
  status: StatementStatus
  created_at: string
}

export interface BankImport {
  id: string
  building_id: string
  period_id: string
  file_name: string
  imported_at: string
}

export interface BankTransaction {
  id: string
  bank_import_id: string
  date: string
  amount: number
  reference: string
  description: string
  matched_unit_id: string | null
  match_status: MatchStatus
  created_at: string
}

export interface Payment {
  id: string
  statement_id: string
  bank_transaction_id: string
  amount: number
  payment_date: string
  confirmed_by: string
  confirmed_at: string
}

export interface Receipt {
  id: string
  payment_id: string
  receipt_number: string
  generated_at: string
}
