import { useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useToast } from "@/hooks/use-toast";

export interface TableSubscription {
  table: string;
  channelName: string;
  filter?: string;
  labels?: {
    insert?: string;
    update?: string;
    delete?: string;
  };
  /** Optional condition check before refresh */
  condition?: () => boolean;
}

export interface UseRealtimeSyncOptions {
  /** Array of table subscriptions */
  tables: TableSubscription[];
  /** Callback to refresh data */
  onRefresh: () => void;
  /** Whether to enable sync (e.g., when data exists) */
  enabled?: boolean;
  /** Dependencies that should trigger re-subscription */
  dependencies?: any[];
  /** Use shadcn toast instead of sonner */
  useShadcnToast?: boolean;
}

/**
 * Custom hook for real-time synchronization with Supabase
 * Handles page focus refresh and table subscriptions
 */
export const useRealtimeSync = ({
  tables,
  onRefresh,
  enabled = true,
  dependencies = [],
  useShadcnToast = false,
}: UseRealtimeSyncOptions) => {
  const { toast: shadcnToast } = useToast();
  const onRefreshRef = useRef(onRefresh);
  
  // Keep onRefresh ref updated
  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  // Page focus/visibility refresh
  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        onRefreshRef.current();
      }
    };

    const handleFocus = () => {
      onRefreshRef.current();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [enabled, ...dependencies]);

  // Real-time table subscriptions
  useEffect(() => {
    const channels: ReturnType<typeof supabase.channel>[] = [];

    tables.forEach(({ table, channelName, filter, labels, condition }) => {
      const channelConfig: any = { 
        event: '*', 
        schema: 'public', 
        table 
      };
      
      if (filter) {
        channelConfig.filter = filter;
      }

      const channel = supabase
        .channel(channelName)
        .on('postgres_changes', channelConfig, (payload) => {
          console.log(`Realtime - ${table} changed:`, payload);
          
          // Check condition if provided
          if (condition && !condition()) {
            return;
          }
          
          // Only refresh if enabled
          if (enabled) {
            onRefreshRef.current();
          }
          
          // Show toast notifications
          const defaultLabels = {
            insert: `🔄 ${table} 데이터가 추가되었습니다`,
            update: `🔄 ${table} 데이터가 수정되었습니다`,
            delete: `🔄 ${table} 데이터가 삭제되었습니다`,
          };
          
          const toastLabels = labels || defaultLabels;
          
          if (useShadcnToast) {
            if (payload.eventType === 'INSERT' && toastLabels.insert) {
              shadcnToast({ title: toastLabels.insert, description: "목록이 자동으로 갱신됩니다" });
            } else if (payload.eventType === 'UPDATE' && toastLabels.update) {
              shadcnToast({ title: toastLabels.update, description: "목록이 자동으로 갱신됩니다" });
            } else if (payload.eventType === 'DELETE' && toastLabels.delete) {
              shadcnToast({ title: toastLabels.delete, description: "목록이 자동으로 갱신됩니다" });
            }
          } else {
            if (payload.eventType === 'INSERT' && toastLabels.insert) {
              toast.info(toastLabels.insert);
            } else if (payload.eventType === 'UPDATE' && toastLabels.update) {
              toast.info(toastLabels.update);
            } else if (payload.eventType === 'DELETE' && toastLabels.delete) {
              toast.info(toastLabels.delete);
            }
          }
        })
        .subscribe();

      channels.push(channel);
    });

    // Cleanup: remove all channels
    return () => {
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, [enabled, useShadcnToast, ...dependencies]);
};

// Pre-configured table subscriptions for common use cases
export const POINTS_TABLES: TableSubscription[] = [
  {
    table: 'merits',
    channelName: 'realtime_merits',
    labels: {
      insert: '🔄 상점이 추가되었습니다',
      update: '🔄 상점이 수정되었습니다',
      delete: '🔄 상점이 삭제되었습니다',
    },
  },
  {
    table: 'demerits',
    channelName: 'realtime_demerits',
    labels: {
      insert: '🔄 벌점이 추가되었습니다',
      update: '🔄 벌점이 수정되었습니다',
      delete: '🔄 벌점이 삭제되었습니다',
    },
  },
  {
    table: 'monthly',
    channelName: 'realtime_monthly',
    labels: {
      insert: '🔄 이달의 학생이 추가되었습니다',
      update: '🔄 이달의 학생이 수정되었습니다',
      delete: '🔄 이달의 학생이 삭제되었습니다',
    },
  },
];

export const COUNSELING_TABLE: TableSubscription[] = [
  {
    table: 'career_counseling',
    channelName: 'realtime_counseling',
    labels: {
      insert: '🔄 상담 기록이 추가되었습니다',
      update: '🔄 상담 기록이 수정되었습니다',
      delete: '🔄 상담 기록이 삭제되었습니다',
    },
  },
];

export const EMAIL_HISTORY_TABLE: TableSubscription[] = [
  {
    table: 'email_history',
    channelName: 'realtime_email_history',
    labels: {
      insert: '🔄 이메일이 발송되었습니다',
      update: '🔄 이메일 정보가 수정되었습니다',
      delete: undefined, // No delete notification for emails
    },
  },
];
