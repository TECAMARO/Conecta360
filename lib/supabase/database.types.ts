export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type AppointmentStatus =
  | 'confirmada'
  | 'pendiente'
  | 'rechazada'
  | 'cancelada_enviada'
  | 'cancelada_conflicto'
  | 'anulada_por_cruce'
  | 'anulada_por_limite'
  | 'completada'

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          job_title: string | null
          organization_name: string | null
          region: string | null
          sector: string | null
          description: string | null
          offers: string[] | null
          seeks: string[] | null
          is_published: boolean | null
          logo_url: string | null
          brochure_url: string | null
          created_at: string | null
          updated_at: string | null
          role: string | null
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
          job_title?: string | null
          organization_name?: string | null
          region?: string | null
          sector?: string | null
          description?: string | null
          offers?: string[] | null
          seeks?: string[] | null
          is_published?: boolean | null
          logo_url?: string | null
          brochure_url?: string | null
          created_at?: string | null
          updated_at?: string | null
          role?: string | null
        }
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      meetings: {
        Row: {
          id: string
          requester_id: string
          recipient_id: string
          day: string
          slot_time: string
          proposal: string | null
          status: string
          modality: string
          table_number: number
          created_at: string | null
        }
        Insert: {
          id?: string
          requester_id: string
          recipient_id: string
          day: string
          slot_time: string
          proposal?: string | null
          status?: string
          modality?: string
          table_number: number
          created_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['meetings']['Insert']>
      }
      evaluations: {
        Row: {
          id: string
          meeting_id: string
          user_id: string
          attendance: string
          alliance_expectation: string | null
          notes: string | null
          evaluated_at: string
        }
        Insert: {
          id?: string
          meeting_id: string
          user_id: string
          attendance: string
          alliance_expectation?: string | null
          notes?: string | null
          evaluated_at?: string
        }
        Update: Partial<Database['public']['Tables']['evaluations']['Insert']>
      }
      messages: {
        Row: {
          id: string
          sender_id: string
          receiver_id: string
          content: string
          meeting_id: string | null
          created_at: string
          read_at: string | null
        }
        Insert: {
          id?: string
          sender_id: string
          receiver_id: string
          content: string
          meeting_id?: string | null
          created_at?: string
          read_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['messages']['Insert']>
      }
    }
    Functions: {
      get_active_meeting_occupancy: {
        Args: Record<string, never>
        Returns: {
          id: string
          day: string
          slot_time: string
          table_number: number
          status: string
          created_at: string | null
          requester_id: string
          recipient_id: string
        }[]
      }
      correct_duplicate_pending_tables: {
        Args: Record<string, never>
        Returns: number
      }
      insert_meeting_request_with_table: {
        Args: {
          p_recipient_id: string
          p_day: string
          p_slot_time: string
          p_proposal?: string
        }
        Returns: MeetingRow
      }
      admin_cancel_meeting: {
        Args: { p_meeting_id: string }
        Returns: MeetingRow
      }
      issue_admin_otp_challenge: {
        Args: { p_otp_hash: string; p_expires_at: string }
        Returns: undefined
      }
      verify_admin_otp_challenge: {
        Args: { p_otp_hash: string }
        Returns: boolean
      }
    }
  }
}

export type ProfileRow = Database['public']['Tables']['profiles']['Row']
export type ProfileUpsert = Database['public']['Tables']['profiles']['Insert']
export type MeetingRow = Database['public']['Tables']['meetings']['Row']
export type MeetingInsert = Database['public']['Tables']['meetings']['Insert']
