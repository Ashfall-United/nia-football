// Hand-written stopgap matching the migrations in supabase/migrations/.
// Once a real Supabase project is linked, replace this file with the output of:
//   supabase gen types typescript --local > src/types/database.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type OrganisationRole =
  | "owner"
  | "admin"
  | "coach"
  | "analyst"
  | "media"
  | "viewer";

export type OrganisationType =
  | "academy"
  | "youth_club"
  | "semi_professional"
  | "professional"
  | "school_university";

export type PlayerPosition =
  | "gk"
  | "rb"
  | "cb"
  | "lb"
  | "rwb"
  | "lwb"
  | "cdm"
  | "cm"
  | "cam"
  | "rm"
  | "lm"
  | "rw"
  | "lw"
  | "st"
  | "cf";

export type SessionType = "training" | "match";

export type PitchSurface =
  | "grass"
  | "turf"
  | "gravel"
  | "sand"
  | "mud"
  | "mixed"
  | "other";

export type VideoStatus = "uploading" | "ready" | "error";

export type EventType =
  | "build_up"
  | "progression"
  | "chance_creation"
  | "shot"
  | "goal"
  | "cross"
  | "third_man_action"
  | "half_space_reception"
  | "rotation"
  | "space_creation"
  | "space_exploitation"
  | "press"
  | "pressing_pair"
  | "counterpress"
  | "recovery"
  | "interception"
  | "defensive_transition"
  | "block"
  | "foul"
  | "corner"
  | "free_kick"
  | "throw_in"
  | "substitution"
  | "injury"
  | "pause";

export type EventReviewStatus = "suggested" | "confirmed" | "edited" | "rejected";

export type ShareResourceType = "clip" | "playlist";

export type HeatmapTarget = "person" | "ball";

export type OrganisationPlan = "early_access" | "standard" | "pro";

export type Database = {
  public: {
    Tables: {
      organisations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          organisation_type: OrganisationType;
          country: string;
          logo_url: string | null;
          referral_source: string | null;
          plan: OrganisationPlan;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          organisation_type: OrganisationType;
          country: string;
          logo_url?: string | null;
          referral_source?: string | null;
          plan?: OrganisationPlan;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          organisation_type?: OrganisationType;
          country?: string;
          logo_url?: string | null;
          referral_source?: string | null;
          plan?: OrganisationPlan;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      organisation_members: {
        Row: {
          id: string;
          organisation_id: string;
          user_id: string;
          role: OrganisationRole;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          user_id: string;
          role: OrganisationRole;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          user_id?: string;
          role?: OrganisationRole;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "organisation_members_organisation_id_fkey";
            columns: ["organisation_id"];
            isOneToOne: false;
            referencedRelation: "organisations";
            referencedColumns: ["id"];
          },
        ];
      };
      organisation_invites: {
        Row: {
          id: string;
          organisation_id: string;
          email: string;
          role: OrganisationRole;
          token: string;
          invited_by: string;
          expires_at: string;
          accepted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          email: string;
          role: OrganisationRole;
          token?: string;
          invited_by: string;
          expires_at?: string;
          accepted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          email?: string;
          role?: OrganisationRole;
          token?: string;
          invited_by?: string;
          expires_at?: string;
          accepted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "organisation_invites_organisation_id_fkey";
            columns: ["organisation_id"];
            isOneToOne: false;
            referencedRelation: "organisations";
            referencedColumns: ["id"];
          },
        ];
      };
      teams: {
        Row: {
          id: string;
          organisation_id: string;
          name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          name?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "teams_organisation_id_fkey";
            columns: ["organisation_id"];
            isOneToOne: false;
            referencedRelation: "organisations";
            referencedColumns: ["id"];
          },
        ];
      };
      players: {
        Row: {
          id: string;
          organisation_id: string;
          team_id: string | null;
          first_name: string;
          last_name: string;
          date_of_birth: string | null;
          position: PlayerPosition | null;
          jersey_number: number | null;
          photo_path: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          team_id?: string | null;
          first_name: string;
          last_name: string;
          date_of_birth?: string | null;
          position?: PlayerPosition | null;
          jersey_number?: number | null;
          photo_path: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          team_id?: string | null;
          first_name?: string;
          last_name?: string;
          date_of_birth?: string | null;
          position?: PlayerPosition | null;
          jersey_number?: number | null;
          photo_path?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "players_organisation_id_fkey";
            columns: ["organisation_id"];
            isOneToOne: false;
            referencedRelation: "organisations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "players_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      sessions: {
        Row: {
          id: string;
          organisation_id: string;
          team_id: string;
          type: SessionType;
          scheduled_at: string;
          location: string | null;
          pitch_surface: PitchSurface | null;
          notes: string | null;
          opponent_name: string | null;
          is_home: boolean | null;
          competition: string | null;
          team_score: number | null;
          opponent_score: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          team_id: string;
          type: SessionType;
          scheduled_at: string;
          location?: string | null;
          pitch_surface?: PitchSurface | null;
          notes?: string | null;
          opponent_name?: string | null;
          is_home?: boolean | null;
          competition?: string | null;
          team_score?: number | null;
          opponent_score?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          team_id?: string;
          type?: SessionType;
          scheduled_at?: string;
          location?: string | null;
          pitch_surface?: PitchSurface | null;
          notes?: string | null;
          opponent_name?: string | null;
          is_home?: boolean | null;
          competition?: string | null;
          team_score?: number | null;
          opponent_score?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sessions_organisation_id_fkey";
            columns: ["organisation_id"];
            isOneToOne: false;
            referencedRelation: "organisations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sessions_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      cameras: {
        Row: {
          id: string;
          organisation_id: string;
          name: string;
          stream_live_input_id: string | null;
          active_session_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          name: string;
          stream_live_input_id?: string | null;
          active_session_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          name?: string;
          stream_live_input_id?: string | null;
          active_session_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cameras_organisation_id_fkey";
            columns: ["organisation_id"];
            isOneToOne: false;
            referencedRelation: "organisations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cameras_active_session_id_fkey";
            columns: ["active_session_id"];
            isOneToOne: false;
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      videos: {
        Row: {
          id: string;
          organisation_id: string;
          session_id: string;
          camera_id: string;
          cloudflare_stream_uid: string;
          status: VideoStatus;
          duration_seconds: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          session_id: string;
          camera_id: string;
          cloudflare_stream_uid: string;
          status?: VideoStatus;
          duration_seconds?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          session_id?: string;
          camera_id?: string;
          cloudflare_stream_uid?: string;
          status?: VideoStatus;
          duration_seconds?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "videos_organisation_id_fkey";
            columns: ["organisation_id"];
            isOneToOne: false;
            referencedRelation: "organisations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "videos_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "videos_camera_id_fkey";
            columns: ["camera_id"];
            isOneToOne: false;
            referencedRelation: "cameras";
            referencedColumns: ["id"];
          },
        ];
      };
      clips: {
        Row: {
          id: string;
          organisation_id: string;
          video_id: string;
          title: string;
          start_seconds: number;
          end_seconds: number;
          notes: string | null;
          source_event_id: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          video_id: string;
          title: string;
          start_seconds: number;
          end_seconds: number;
          notes?: string | null;
          source_event_id?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          video_id?: string;
          title?: string;
          start_seconds?: number;
          end_seconds?: number;
          notes?: string | null;
          source_event_id?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "clips_organisation_id_fkey";
            columns: ["organisation_id"];
            isOneToOne: false;
            referencedRelation: "organisations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "clips_video_id_fkey";
            columns: ["video_id"];
            isOneToOne: false;
            referencedRelation: "videos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "clips_source_event_id_fkey";
            columns: ["source_event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      playlists: {
        Row: {
          id: string;
          organisation_id: string;
          title: string;
          description: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          title: string;
          description?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          title?: string;
          description?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "playlists_organisation_id_fkey";
            columns: ["organisation_id"];
            isOneToOne: false;
            referencedRelation: "organisations";
            referencedColumns: ["id"];
          },
        ];
      };
      playlist_clips: {
        Row: {
          playlist_id: string;
          clip_id: string;
          position: number;
        };
        Insert: {
          playlist_id: string;
          clip_id: string;
          position: number;
        };
        Update: {
          playlist_id?: string;
          clip_id?: string;
          position?: number;
        };
        Relationships: [
          {
            foreignKeyName: "playlist_clips_playlist_id_fkey";
            columns: ["playlist_id"];
            isOneToOne: false;
            referencedRelation: "playlists";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "playlist_clips_clip_id_fkey";
            columns: ["clip_id"];
            isOneToOne: false;
            referencedRelation: "clips";
            referencedColumns: ["id"];
          },
        ];
      };
      shared_links: {
        Row: {
          id: string;
          organisation_id: string;
          token: string;
          resource_type: ShareResourceType;
          resource_id: string;
          created_by: string;
          expires_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          token?: string;
          resource_type: ShareResourceType;
          resource_id: string;
          created_by: string;
          expires_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          token?: string;
          resource_type?: ShareResourceType;
          resource_id?: string;
          created_by?: string;
          expires_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "shared_links_organisation_id_fkey";
            columns: ["organisation_id"];
            isOneToOne: false;
            referencedRelation: "organisations";
            referencedColumns: ["id"];
          },
        ];
      };
      events: {
        Row: {
          id: string;
          organisation_id: string;
          video_id: string;
          type: EventType;
          timestamp_seconds: number;
          review_status: EventReviewStatus;
          notes: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          video_id: string;
          type: EventType;
          timestamp_seconds: number;
          review_status?: EventReviewStatus;
          notes?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          video_id?: string;
          type?: EventType;
          timestamp_seconds?: number;
          review_status?: EventReviewStatus;
          notes?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "events_organisation_id_fkey";
            columns: ["organisation_id"];
            isOneToOne: false;
            referencedRelation: "organisations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "events_video_id_fkey";
            columns: ["video_id"];
            isOneToOne: false;
            referencedRelation: "videos";
            referencedColumns: ["id"];
          },
        ];
      };
      event_players: {
        Row: {
          event_id: string;
          player_id: string;
        };
        Insert: {
          event_id: string;
          player_id: string;
        };
        Update: {
          event_id?: string;
          player_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "event_players_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "event_players_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
        ];
      };
      video_calibrations: {
        Row: {
          id: string;
          organisation_id: string;
          video_id: string;
          pitch_length_meters: number;
          pitch_width_meters: number;
          points: Json;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          video_id: string;
          pitch_length_meters: number;
          pitch_width_meters: number;
          points: Json;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          video_id?: string;
          pitch_length_meters?: number;
          pitch_width_meters?: number;
          points?: Json;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "video_calibrations_organisation_id_fkey";
            columns: ["organisation_id"];
            isOneToOne: false;
            referencedRelation: "organisations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "video_calibrations_video_id_fkey";
            columns: ["video_id"];
            isOneToOne: true;
            referencedRelation: "videos";
            referencedColumns: ["id"];
          },
        ];
      };
      heatmaps: {
        Row: {
          id: string;
          organisation_id: string;
          video_id: string;
          calibration_id: string;
          target: HeatmapTarget;
          sample_fps: number;
          frame_count: number;
          sample_count: number;
          grid_cols: number;
          grid_rows: number;
          grid: Json;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          video_id: string;
          calibration_id: string;
          target: HeatmapTarget;
          sample_fps: number;
          frame_count: number;
          sample_count: number;
          grid_cols: number;
          grid_rows: number;
          grid: Json;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          video_id?: string;
          calibration_id?: string;
          target?: HeatmapTarget;
          sample_fps?: number;
          frame_count?: number;
          sample_count?: number;
          grid_cols?: number;
          grid_rows?: number;
          grid?: Json;
          created_by?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "heatmaps_organisation_id_fkey";
            columns: ["organisation_id"];
            isOneToOne: false;
            referencedRelation: "organisations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "heatmaps_video_id_fkey";
            columns: ["video_id"];
            isOneToOne: false;
            referencedRelation: "videos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "heatmaps_calibration_id_fkey";
            columns: ["calibration_id"];
            isOneToOne: false;
            referencedRelation: "video_calibrations";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_organisation: {
        Args: {
          org_name: string;
          org_slug: string;
          org_type: OrganisationType;
          org_country: string;
          org_logo_url?: string | null;
          org_referral_source?: string | null;
        };
        Returns: Database["public"]["Tables"]["organisations"]["Row"];
      };
      is_organisation_member: {
        Args: { org_id: string };
        Returns: boolean;
      };
      has_organisation_role: {
        Args: { org_id: string; roles: OrganisationRole[] };
        Returns: boolean;
      };
      find_user_id_by_email: {
        Args: { user_email: string };
        Returns: string | null;
      };
      get_organisation_invite_preview: {
        Args: { invite_token: string };
        Returns: {
          organisation_name: string;
          organisation_slug: string;
          role: OrganisationRole;
          email: string;
          is_expired: boolean;
          is_accepted: boolean;
        }[];
      };
      accept_organisation_invite: {
        Args: { invite_token: string };
        Returns: string;
      };
      list_organisation_members: {
        Args: { org_id: string };
        Returns: {
          member_id: string;
          user_id: string;
          email: string;
          role: OrganisationRole;
          created_at: string;
        }[];
      };
      get_shared_link_preview: {
        Args: { link_token: string };
        Returns: Json;
      };
    };
    Enums: {
      organisation_role: OrganisationRole;
      organisation_type: OrganisationType;
      player_position: PlayerPosition;
      session_type: SessionType;
      pitch_surface: PitchSurface;
      video_status: VideoStatus;
      event_type: EventType;
      event_review_status: EventReviewStatus;
      share_resource_type: ShareResourceType;
      organisation_plan: OrganisationPlan;
      heatmap_target: HeatmapTarget;
    };
    CompositeTypes: Record<string, never>;
  };
};
