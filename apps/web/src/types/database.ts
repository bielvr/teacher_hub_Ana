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
          created_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          avatar_url?: string | null;
          phone?: string | null;
          email?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          avatar_url?: string | null;
          phone?: string | null;
          email?: string | null;
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
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          logo_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          logo_url?: string | null;
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
            foreignKeyName: "organization_members_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "organization_members_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
      };
      activities: {
        Row: {
          id: string;
          lesson_id: string;
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
          lesson_id: string;
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
          lesson_id?: string;
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
        Relationships: [];
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
          updated_at: string;
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
          updated_at?: string;
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
          updated_at?: string;
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
    };
  };
}
