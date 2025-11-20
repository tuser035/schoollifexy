import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, Trash2, Search, Database } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface AuditLog {
  id: string;
  created_at: string;
  user_id: string;
  user_type: string;
  action_type: string;
  table_name: string;
  record_id: string;
  status: string;
  error_message: string;
  ip_address: string;
  user_agent: string;
  old_data: any;
  new_data: any;
}

const DatabaseLogs = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filterTable, setFilterTable] = useState<string>("all");
  const [filterAction, setFilterAction] = useState<string>("all");
  const [filterUserType, setFilterUserType] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [limit, setLimit] = useState(100);

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const authUser = localStorage.getItem("auth_user");
      if (!authUser) {
        toast.error("관리자 인증이 필요합니다");
        return;
      }

      const parsedUser = JSON.parse(authUser);
      if (parsedUser.type !== "admin") {
        toast.error("관리자 권한이 필요합니다");
        return;
      }

      const { data, error } = await supabase.rpc("get_audit_logs", {
        p_admin_id: parsedUser.id,
        p_limit: limit
      });

      if (error) throw error;

      setLogs(data || []);
      toast.success(`${(data || []).length}개의 로그를 불러왔습니다`);
    } catch (error: any) {
      console.error("로그 로딩 오류:", error);
      toast.error(error.message || "로그 조회에 실패했습니다");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteOldLogs = async () => {
    try {
      const authUser = localStorage.getItem("auth_user");
      if (!authUser) {
        toast.error("관리자 인증이 필요합니다");
        return;
      }

      const parsedUser = JSON.parse(authUser);
      if (parsedUser.type !== "admin") {
        toast.error("관리자 권한이 필요합니다");
        return;
      }

      const { data, error } = await supabase.rpc("delete_old_audit_logs", {
        p_admin_id: parsedUser.id,
        p_days_old: 90
      });

      if (error) throw error;

      toast.success(`${data}개의 오래된 로그가 삭제되었습니다`);
      setShowDeleteConfirm(false);
      loadLogs();
    } catch (error: any) {
      console.error("로그 삭제 오류:", error);
      toast.error(error.message || "로그 삭제에 실패했습니다");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  };

  const getActionBadgeVariant = (action: string): "default" | "secondary" | "destructive" | "outline" => {
    if (action === "insert") return "default";
    if (action === "update") return "secondary";
    if (action === "delete") return "destructive";
    return "outline";
  };

  const getStatusBadgeVariant = (status: string): "default" | "destructive" => {
    return status === "success" ? "default" : "destructive";
  };

  // 실시간 업데이트 구독
  useEffect(() => {
    loadLogs();

    const channel = supabase
      .channel('db-logs-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'audit_logs'
        },
        (payload) => {
          console.log('새 로그 감지:', payload);
          loadLogs(); // 새 로그가 추가되면 자동으로 새로고침
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [limit]);

  // 필터링된 로그
  const filteredLogs = logs.filter(log => {
    const matchesTable = filterTable === "all" || log.table_name === filterTable;
    const matchesAction = filterAction === "all" || log.action_type === filterAction;
    const matchesUserType = filterUserType === "all" || log.user_type === filterUserType;
    const matchesSearch = !searchTerm || 
      log.user_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.record_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.table_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesTable && matchesAction && matchesUserType && matchesSearch;
  });

  // 고유한 테이블 목록
  const uniqueTables = Array.from(new Set(logs.map(log => log.table_name).filter(Boolean)));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            <CardTitle>데이터베이스 변경 로그</CardTitle>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => setShowDeleteConfirm(true)} 
              disabled={isLoading} 
              variant="destructive"
              size="sm"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              90일 이상 로그 삭제
            </Button>
            <Button onClick={loadLogs} disabled={isLoading} variant="outline" size="sm">
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              새로고침
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* 필터 및 검색 */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
            <div>
              <Label>테이블</Label>
              <Select value={filterTable} onValueChange={setFilterTable}>
                <SelectTrigger>
                  <SelectValue placeholder="전체" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  {uniqueTables.map(table => (
                    <SelectItem key={table} value={table}>{table}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>작업 유형</Label>
              <Select value={filterAction} onValueChange={setFilterAction}>
                <SelectTrigger>
                  <SelectValue placeholder="전체" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="insert">생성 (INSERT)</SelectItem>
                  <SelectItem value="update">수정 (UPDATE)</SelectItem>
                  <SelectItem value="delete">삭제 (DELETE)</SelectItem>
                  <SelectItem value="login_success">로그인 성공</SelectItem>
                  <SelectItem value="login_failed">로그인 실패</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>사용자 유형</Label>
              <Select value={filterUserType} onValueChange={setFilterUserType}>
                <SelectTrigger>
                  <SelectValue placeholder="전체" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="admin">관리자</SelectItem>
                  <SelectItem value="teacher">교사</SelectItem>
                  <SelectItem value="student">학생</SelectItem>
                  <SelectItem value="system">시스템</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>표시 개수</Label>
              <Select value={limit.toString()} onValueChange={(v) => setLimit(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50">50개</SelectItem>
                  <SelectItem value="100">100개</SelectItem>
                  <SelectItem value="200">200개</SelectItem>
                  <SelectItem value="500">500개</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>검색</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="사용자 ID, 레코드 ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </div>

          {/* 로그 테이블 */}
          {filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              로그가 없습니다
            </div>
          ) : (
            <div className="border rounded-lg overflow-auto max-h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[150px]">시간</TableHead>
                    <TableHead>사용자</TableHead>
                    <TableHead>작업</TableHead>
                    <TableHead>테이블</TableHead>
                    <TableHead>레코드 ID</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>에러</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs">
                        {formatDate(log.created_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-xs font-mono">{log.user_id?.substring(0, 8)}...</span>
                          <Badge variant="outline" className="text-xs w-fit mt-1">
                            {log.user_type}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getActionBadgeVariant(log.action_type)}>
                          {log.action_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {log.table_name || "-"}
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {log.record_id ? `${log.record_id.substring(0, 8)}...` : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(log.status)}>
                          {log.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                        {log.error_message || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="mt-4 text-sm text-muted-foreground">
            총 {logs.length}개 중 {filteredLogs.length}개 표시
          </div>
        </CardContent>
      </Card>

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>오래된 로그 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              90일 이상 된 로그를 모두 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteOldLogs} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DatabaseLogs;
