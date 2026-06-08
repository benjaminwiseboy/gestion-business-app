export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type LoanDirection = "lent" | "borrowed";
export type LoanStatus = "active" | "repaid" | "overdue" | "partial";
export type InterestType = "simple" | "compound" | "none";
export type TransactionKind =
  | "loan_disbursement"
  | "repayment"
  | "land_payment"
  | "investment_in"
  | "investment_out"
  | "fee"
  | "adjustment";
export type LinkedEntityType =
  | "loan"
  | "land_project"
  | "admin_file"
  | "investment";
export type ChangeLogAction = "insert" | "update" | "delete";

type Timestamps = {
  created_at: string;
  updated_at: string;
};

type SoftDelete = {
  deleted_at: string | null;
};

export interface Database {
  public: {
    Tables: {
      currencies: {
        Row: {
          code: string;
          symbol: string;
          decimals: number;
          default_rate_to_xof: number;
          created_at: string;
        };
        Insert: never;
        Update: never;
      };
      user_settings: {
        Row: {
          owner_id: string;
          usd_to_xof_rate: number;
          default_currency: string;
        } & Timestamps;
        Insert: {
          owner_id?: string;
          usd_to_xof_rate?: number;
          default_currency?: string;
        };
        Update: {
          usd_to_xof_rate?: number;
          default_currency?: string;
        };
      };
      persons: {
        Row: {
          id: string;
          owner_id: string;
          full_name: string;
          roles: string[];
          phone: string | null;
          email: string | null;
          address: string | null;
          notes: string | null;
        } & Timestamps &
          SoftDelete;
        Insert: {
          id?: string;
          owner_id?: string;
          full_name: string;
          roles?: string[];
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          notes?: string | null;
        };
        Update: {
          full_name?: string;
          roles?: string[];
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          notes?: string | null;
          deleted_at?: string | null;
        };
      };
      loans: {
        Row: {
          id: string;
          owner_id: string;
          person_id: string;
          direction: LoanDirection;
          principal_amount: number;
          principal_currency: string;
          interest_rate: number | null;
          interest_type: InterestType | null;
          issue_date: string;
          due_date: string | null;
          status: LoanStatus;
          notes: string | null;
        } & Timestamps &
          SoftDelete;
        Insert: {
          id?: string;
          owner_id?: string;
          person_id: string;
          direction: LoanDirection;
          principal_amount: number;
          principal_currency: string;
          interest_rate?: number | null;
          interest_type?: InterestType | null;
          issue_date: string;
          due_date?: string | null;
          status?: LoanStatus;
          notes?: string | null;
        };
        Update: {
          person_id?: string;
          direction?: LoanDirection;
          principal_amount?: number;
          principal_currency?: string;
          interest_rate?: number | null;
          interest_type?: InterestType | null;
          issue_date?: string;
          due_date?: string | null;
          status?: LoanStatus;
          notes?: string | null;
          deleted_at?: string | null;
        };
      };
      transactions: {
        Row: {
          id: string;
          owner_id: string;
          kind: TransactionKind;
          amount: number;
          currency: string;
          exchange_rate_snapshot: number;
          occurred_at: string;
          person_id: string | null;
          linked_entity_type: LinkedEntityType | null;
          linked_entity_id: string | null;
          notes: string | null;
        } & Timestamps &
          SoftDelete;
        Insert: {
          id?: string;
          owner_id?: string;
          kind: TransactionKind;
          amount: number;
          currency: string;
          exchange_rate_snapshot?: number;
          occurred_at: string;
          person_id?: string | null;
          linked_entity_type?: LinkedEntityType | null;
          linked_entity_id?: string | null;
          notes?: string | null;
        };
        Update: {
          kind?: TransactionKind;
          amount?: number;
          currency?: string;
          exchange_rate_snapshot?: number;
          occurred_at?: string;
          person_id?: string | null;
          linked_entity_type?: LinkedEntityType | null;
          linked_entity_id?: string | null;
          notes?: string | null;
          deleted_at?: string | null;
        };
      };
      change_log: {
        Row: {
          id: string;
          owner_id: string;
          entity_type: string;
          entity_id: string;
          action: ChangeLogAction;
          diff: Json;
          changed_at: string;
        };
        Insert: never;
        Update: never;
      };
    };
    Views: {
      loan_remaining: {
        Row: {
          loan_id: string;
          owner_id: string;
          currency: string;
          principal_amount: number;
          repaid_amount: number;
          remaining_amount: number;
        };
      };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

// Convenience helpers
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
export type Views<T extends keyof Database["public"]["Views"]> =
  Database["public"]["Views"][T]["Row"];
