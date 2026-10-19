export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type MemberRole = 'owner' | 'admin' | 'teacher' | 'tutor' | 'student';
export type MemberStatus = 'active' | 'invited' | 'suspended';
export type SessionStatus = 'scheduled' | 'live' | 'finished' | 'cancelled';
export type LessonReleaseType = 'immediate' | 'scheduled';
export type ActivityType =
  | 'video'
  | 'pdf'
  | 'quiz'
  | 'text'
  | 'audio'
  | 'external_link'
  | 'assignment';
export type AffiliatePartnerStatus = 'active' | 'inactive' | 'suspended';
export type AffiliatePlanCycle = 'monthly' | 'yearly';
export type AffiliateCommissionStatus = 'pending' | 'available' | 'paid' | 'cancelled';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          avatar_url: string | null;
          phone: string | null;
          email: string | null;
          email_reminders_enabled: boolean;
          class_reminder_1h: boolean;
          push_notifications_enabled: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          avatar_url?: string | null;
          phone?: string | null;
          email?: string | null;
          email_reminders_enabled?: boolean;
          class_reminder_1h?: boolean;
          push_notifications_enabled?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          avatar_url?: string | null;
          phone?: string | null;
          email?: string | null;
          email_reminders_enabled?: boolean;
          class_reminder_1h?: boolean;
          push_notifications_enabled?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };

      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          logo_url: string | null;
          plan_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          logo_url?: string | null;
          plan_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          logo_url?: string | null;
          plan_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };

      organization_members: {
        Row: {
          id: string;
          organization_id: string;
          profile_id: string;
          role: MemberRole;
          status: MemberStatus;
          joined_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          profile_id: string;
          role?: MemberRole;
          status?: MemberStatus;
          joined_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          profile_id?: string;
          role?: MemberRole;
          status?: MemberStatus;
          joined_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'organization_members_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'organization_members_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };

      classes: {
        Row: {
          id: string;
          organization_id: string;
          teacher_id: string | null;
          name: string;
          level: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          teacher_id?: string | null;
          name: string;
          level?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          teacher_id?: string | null;
          name?: string;
          level?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'classes_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'classes_teacher_id_fkey';
            columns: ['teacher_id'];
            isOneToOne: false;
            referencedRelation: 'organization_members';
            referencedColumns: ['id'];
          }
        ];
      };

      class_students: {
        Row: {
          class_id: string;
          student_id: string;
          enrolled_at: string;
        };
        Insert: {
          class_id: string;
          student_id: string;
          enrolled_at?: string;
        };
        Update: {
          class_id?: string;
          student_id?: string;
          enrolled_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'class_students_class_id_fkey';
            columns: ['class_id'];
            isOneToOne: false;
            referencedRelation: 'classes';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'class_students_student_id_fkey';
            columns: ['student_id'];
            isOneToOne: false;
            referencedRelation: 'organization_members';
            referencedColumns: ['id'];
          }
        ];
      };

      tracks: {
        Row: {
          id: string;
          organization_id: string;
          title: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          title: string;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          title?: string;
          description?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'tracks_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          }
        ];
      };

      modules: {
        Row: {
          id: string;
          track_id: string;
          title: string;
          order_index: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          track_id: string;
          title: string;
          order_index?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          track_id?: string;
          title?: string;
          order_index?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'modules_track_id_fkey';
            columns: ['track_id'];
            isOneToOne: false;
            referencedRelation: 'tracks';
            referencedColumns: ['id'];
          }
        ];
      };

      lessons: {
        Row: {
          id: string;
          module_id: string;
          title: string;
          description: string | null;
          order_index: number;
          release_type: LessonReleaseType;
          release_date: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          module_id: string;
          title: string;
          description?: string | null;
          order_index?: number;
          release_type?: LessonReleaseType;
          release_date?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          module_id?: string;
          title?: string;
          description?: string | null;
          order_index?: number;
          release_type?: LessonReleaseType;
          release_date?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'lessons_module_id_fkey';
            columns: ['module_id'];
            isOneToOne: false;
            referencedRelation: 'modules';
            referencedColumns: ['id'];
          }
        ];
      };

      activities: {
        Row: {
          id: string;
          lesson_id: string | null;
          organization_id?: string | null;
          type: ActivityType;
          title: string;
          description: string | null;
          content_markdown: string | null;
          video_url: string | null;
          audio_url: string | null;
          pdf_url: string | null;
          link_url: string | null;
          metadata: Json;
          order_index: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          lesson_id?: string | null;
          organization_id?: string | null;
          type: ActivityType;
          title: string;
          description?: string | null;
          content_markdown?: string | null;
          video_url?: string | null;
          audio_url?: string | null;
          pdf_url?: string | null;
          link_url?: string | null;
          metadata?: Json;
          order_index?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          lesson_id?: string | null;
          organization_id?: string | null;
          type?: ActivityType;
          title?: string;
          description?: string | null;
          content_markdown?: string | null;
          video_url?: string | null;
          audio_url?: string | null;
          pdf_url?: string | null;
          link_url?: string | null;
          metadata?: Json;
          order_index?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'activities_lesson_id_fkey';
            columns: ['lesson_id'];
            isOneToOne: false;
            referencedRelation: 'lessons';
            referencedColumns: ['id'];
          }
        ];
      };

      activity_items: {
        Row: {
          id: string;
          activity_id: string;
          prompt: string;
          question_type: string;
          options: Json;
          accepted_answers: Json;
          explanation: string | null;
          order_index: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          activity_id: string;
          prompt: string;
          question_type: string;
          options?: Json;
          accepted_answers?: Json;
          explanation?: string | null;
          order_index?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          activity_id?: string;
          prompt?: string;
          question_type?: string;
          options?: Json;
          accepted_answers?: Json;
          explanation?: string | null;
          order_index?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'activity_items_activity_id_fkey';
            columns: ['activity_id'];
            isOneToOne: false;
            referencedRelation: 'activities';
            referencedColumns: ['id'];
          }
        ];
      };

      activity_submissions: {
        Row: {
          id: string;
          organization_id: string;
          activity_id: string;
          student_id: string;
          status: string;
          score: number | null;
          teacher_feedback: string | null;
          teacher_id: string | null;
          submitted_at: string;
          reviewed_at: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          activity_id: string;
          student_id: string;
          status?: string;
          score?: number | null;
          teacher_feedback?: string | null;
          teacher_id?: string | null;
          submitted_at?: string;
          reviewed_at?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          activity_id?: string;
          student_id?: string;
          status?: string;
          score?: number | null;
          teacher_feedback?: string | null;
          teacher_id?: string | null;
          submitted_at?: string;
          reviewed_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'activity_submissions_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'activity_submissions_activity_id_fkey';
            columns: ['activity_id'];
            isOneToOne: false;
            referencedRelation: 'activities';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'activity_submissions_student_id_fkey';
            columns: ['student_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };

      activity_answers: {
        Row: {
          id: string;
          submission_id: string;
          item_id: string;
          student_answer: string | null;
          is_correct: boolean | null;
          teacher_feedback: string | null;
          answered_at: string;
        };
        Insert: {
          id?: string;
          submission_id: string;
          item_id: string;
          student_answer?: string | null;
          is_correct?: boolean | null;
          teacher_feedback?: string | null;
          answered_at?: string;
        };
        Update: {
          id?: string;
          submission_id?: string;
          item_id?: string;
          student_answer?: string | null;
          is_correct?: boolean | null;
          teacher_feedback?: string | null;
          answered_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'activity_answers_submission_id_fkey';
            columns: ['submission_id'];
            isOneToOne: false;
            referencedRelation: 'activity_submissions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'activity_answers_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'activity_items';
            referencedColumns: ['id'];
          }
        ];
      };

      live_sessions: {
        Row: {
          id: string;
          organization_id: string;
          class_id: string;
          lesson_id: string | null;
          title: string;
          scheduled_at: string;
          duration_minutes: number;
          meet_url: string | null;
          status: SessionStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          class_id: string;
          lesson_id?: string | null;
          title: string;
          scheduled_at: string;
          duration_minutes?: number;
          meet_url?: string | null;
          status?: SessionStatus;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          class_id?: string;
          lesson_id?: string | null;
          title?: string;
          scheduled_at?: string;
          duration_minutes?: number;
          meet_url?: string | null;
          status?: SessionStatus;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'live_sessions_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'live_sessions_class_id_fkey';
            columns: ['class_id'];
            isOneToOne: false;
            referencedRelation: 'classes';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'live_sessions_lesson_id_fkey';
            columns: ['lesson_id'];
            isOneToOne: false;
            referencedRelation: 'lessons';
            referencedColumns: ['id'];
          }
        ];
      };

      class_sessions: {
        Row: {
          id: string;
          organization_id: string;
          student_id: string;
          lesson_id: string | null;
          title: string;
          scheduled_at: string;
          duration_minutes: number;
          meet_url: string | null;
          status: SessionStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          student_id: string;
          lesson_id?: string | null;
          title: string;
          scheduled_at: string;
          duration_minutes?: number;
          meet_url?: string | null;
          status?: SessionStatus;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          student_id?: string;
          lesson_id?: string | null;
          title?: string;
          scheduled_at?: string;
          duration_minutes?: number;
          meet_url?: string | null;
          status?: SessionStatus;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'class_sessions_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'class_sessions_student_id_fkey';
            columns: ['student_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'class_sessions_lesson_id_fkey';
            columns: ['lesson_id'];
            isOneToOne: false;
            referencedRelation: 'lessons';
            referencedColumns: ['id'];
          }
        ];
      };

      group_sessions: {
        Row: {
          id: string;
          organization_id: string;
          class_id: string;
          lesson_id: string | null;
          title: string;
          scheduled_at: string;
          duration_minutes: number;
          meet_url: string | null;
          status: SessionStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          class_id: string;
          lesson_id?: string | null;
          title: string;
          scheduled_at: string;
          duration_minutes?: number;
          meet_url?: string | null;
          status?: SessionStatus;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          class_id?: string;
          lesson_id?: string | null;
          title?: string;
          scheduled_at?: string;
          duration_minutes?: number;
          meet_url?: string | null;
          status?: SessionStatus;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'group_sessions_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'group_sessions_class_id_fkey';
            columns: ['class_id'];
            isOneToOne: false;
            referencedRelation: 'classes';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'group_sessions_lesson_id_fkey';
            columns: ['lesson_id'];
            isOneToOne: false;
            referencedRelation: 'lessons';
            referencedColumns: ['id'];
          }
        ];
      };

      direct_messages: {
        Row: {
          id: string;
          organization_id: string;
          sender_id: string;
          receiver_id: string;
          content: string;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          sender_id: string;
          receiver_id: string;
          content: string;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          sender_id?: string;
          receiver_id?: string;
          content?: string;
          is_read?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };

      notifications: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          title: string;
          description: string;
          type: string;
          action_url: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          title: string;
          description: string;
          type?: string;
          action_url?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          user_id?: string;
          title?: string;
          description?: string;
          type?: string;
          action_url?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };

      free_submissions: {
        Row: {
          id: string;
          organization_id: string;
          student_id: string;
          title: string;
          content: string;
          status: string;
          teacher_feedback: string | null;
          teacher_id: string | null;
          submitted_at: string;
          reviewed_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          student_id: string;
          title: string;
          content: string;
          status?: string;
          teacher_feedback?: string | null;
          teacher_id?: string | null;
          submitted_at?: string;
          reviewed_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          student_id?: string;
          title?: string;
          content?: string;
          status?: string;
          teacher_feedback?: string | null;
          teacher_id?: string | null;
          submitted_at?: string;
          reviewed_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };

      lesson_notes: {
        Row: {
          id: string;
          organization_id: string;
          student_id: string;
          lesson_id: string | null;
          title: string;
          content: string;
          author_role: 'teacher' | 'student';
          lesson_date: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          student_id: string;
          lesson_id?: string | null;
          title: string;
          content?: string;
          author_role: 'teacher' | 'student';
          lesson_date?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          student_id?: string;
          lesson_id?: string | null;
          title?: string;
          content?: string;
          author_role?: 'teacher' | 'student';
          lesson_date?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      student_review_items: {
        Row: {
          id: string;
          organization_id: string;
          student_id: string;
          item_type: 'lesson' | 'resource' | 'note';
          item_id: string;
          title: string;
          subtitle: string | null;
          content_preview: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          student_id: string;
          item_type: 'lesson' | 'resource' | 'note';
          item_id: string;
          title: string;
          subtitle?: string | null;
          content_preview?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          student_id?: string;
          item_type?: 'lesson' | 'resource' | 'note';
          item_id?: string;
          title?: string;
          subtitle?: string | null;
          content_preview?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };

      system_plans: {
        Row: {
          id: string;
          slug: string;
          name: string;
          price_monthly: number;
          price_yearly: number;
          installment_yearly: number | null;
          max_active_students: number;
          max_teachers: number;
          features: Json;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          price_monthly: number;
          price_yearly: number;
          installment_yearly?: number | null;
          max_active_students?: number;
          max_teachers?: number;
          features?: Json;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          price_monthly?: number;
          price_yearly?: number;
          installment_yearly?: number | null;
          max_active_students?: number;
          max_teachers?: number;
          features?: Json;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };

      expenses: {
        Row: {
          id: string;
          organization_id: string;
          description: string;
          category: string;
          amount: number;
          due_date: string;
          recurrence: string;
          status: string;
          receipt_url: string | null;
          paid_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          description: string;
          category: string;
          amount: number;
          due_date: string;
          recurrence?: string;
          status?: string;
          receipt_url?: string | null;
          paid_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          description?: string;
          category?: string;
          amount?: number;
          due_date?: string;
          recurrence?: string;
          status?: string;
          receipt_url?: string | null;
          paid_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'expenses_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          }
        ];
      };

      payment_records: {
        Row: {
          id: string;
          organization_id: string;
          student_id: string;
          description: string;
          amount: number;
          due_date: string;
          status: string;
          payment_method: string | null;
          paid_at: string | null;
          receipt_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          student_id: string;
          description: string;
          amount: number;
          due_date: string;
          status?: string;
          payment_method?: string | null;
          paid_at?: string | null;
          receipt_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          student_id?: string;
          description?: string;
          amount?: number;
          due_date?: string;
          status?: string;
          payment_method?: string | null;
          paid_at?: string | null;
          receipt_url?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'payment_records_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payment_records_student_id_fkey';
            columns: ['student_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };

      affiliate_partners: {
        Row: {
          id: string;
          profile_id: string;
          referral_code: string;
          status: AffiliatePartnerStatus;
          free_months_end_date: string | null;
          current_quarter_paid_referrals: number;
          pix_key: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          referral_code: string;
          status?: AffiliatePartnerStatus;
          free_months_end_date?: string | null;
          current_quarter_paid_referrals?: number;
          pix_key?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          referral_code?: string;
          status?: AffiliatePartnerStatus;
          free_months_end_date?: string | null;
          current_quarter_paid_referrals?: number;
          pix_key?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'affiliate_partners_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };

      affiliate_referrals: {
        Row: {
          id: string;
          partner_id: string;
          referred_profile_id: string | null;
          plan_slug: string;
          cycle: AffiliatePlanCycle;
          asaas_customer_id: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          partner_id: string;
          referred_profile_id?: string | null;
          plan_slug: string;
          cycle: AffiliatePlanCycle;
          asaas_customer_id?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          partner_id?: string;
          referred_profile_id?: string | null;
          plan_slug?: string;
          cycle?: AffiliatePlanCycle;
          asaas_customer_id?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'affiliate_referrals_partner_id_fkey';
            columns: ['partner_id'];
            isOneToOne: false;
            referencedRelation: 'affiliate_partners';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'affiliate_referrals_referred_profile_id_fkey';
            columns: ['referred_profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };

      affiliate_commissions: {
        Row: {
          id: string;
          partner_id: string;
          referral_id: string | null;
          gross_amount: number;
          commission_percentage: number;
          commission_amount: number;
          status: AffiliateCommissionStatus;
          paid_at: string | null;
          transfer_receipt_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          partner_id: string;
          referral_id?: string | null;
          gross_amount: number;
          commission_percentage: number;
          commission_amount: number;
          status?: AffiliateCommissionStatus;
          paid_at?: string | null;
          transfer_receipt_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          partner_id?: string;
          referral_id?: string | null;
          gross_amount?: number;
          commission_percentage?: number;
          commission_amount?: number;
          status?: AffiliateCommissionStatus;
          paid_at?: string | null;
          transfer_receipt_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'affiliate_commissions_partner_id_fkey';
            columns: ['partner_id'];
            isOneToOne: false;
            referencedRelation: 'affiliate_partners';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'affiliate_commissions_referral_id_fkey';
            columns: ['referral_id'];
            isOneToOne: false;
            referencedRelation: 'affiliate_referrals';
            referencedColumns: ['id'];
          }
        ];
      };

      affiliate_payouts: {
        Row: {
          id: string;
          partner_id: string;
          amount: number;
          receipt_url: string | null;
          notes: string | null;
          paid_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          partner_id: string;
          amount: number;
          receipt_url?: string | null;
          notes?: string | null;
          paid_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          partner_id?: string;
          amount?: number;
          receipt_url?: string | null;
          notes?: string | null;
          paid_at?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'affiliate_payouts_partner_id_fkey';
            columns: ['partner_id'];
            isOneToOne: false;
            referencedRelation: 'affiliate_partners';
            referencedColumns: ['id'];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      member_role: MemberRole;
      member_status: MemberStatus;
      session_status: SessionStatus;
      lesson_release_type: LessonReleaseType;
      activity_type: ActivityType;
      affiliate_partner_status: AffiliatePartnerStatus;
      affiliate_plan_cycle: AffiliatePlanCycle;
      affiliate_commission_status: AffiliateCommissionStatus;
    };
  };
}