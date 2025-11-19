import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, AlertTriangle, CheckCircle, XCircle, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface AuditLog {
  id: string;
  created_at: string;
  user_id: string;
  user_type: string;
  action_type: string;
  table_name: string | null;
  record_id: string | null;
  status: string;
  error_message: string | null;
}

export const SecurityLogs = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [userTypeFilter, setUserTypeFilter] = useState<string>("all");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      
      // Get admin user
      const authUser = localStorage.getItem("auth_user");
      if (!authUser) {
        toast.error("관리자 인증이 필요합니다");
        return;
      }
      
      const user = JSON.parse(authUser);
      if (user.type !== "admin") {
        toast.error("관리자 권한이 필요합니다");
        return;
      }
      
      // Fetch audit logs using RPC function
      const { data, error } = await supabase.rpc("get_audit_logs", {
        p_admin_id: user.id,
        p_limit: 100
      });

      if (error) throw error;
      setLogs(data || []);
    } catch (error: any) {
      console.error("Error fetching logs:", error);
      toast.error("로그를 불러오는데 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  const getActionBadge = (actionType: string, status: string) => {
    if (actionType === "login_success") {
      return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />로그인 성공</Badge>;
    }
    if (actionType === "login_failed") {
      return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />로그인 실패</Badge>;
    }
    if (actionType === "insert") {
      return <Badge variant="outline" className="border-blue-500 text-blue-500">추가</Badge>;
    }
    if (actionType === "update") {
      return <Badge variant="outline" className="border-yellow-500 text-yellow-500">수정</Badge>;
    }
    if (actionType === "delete") {
      return <Badge variant="outline" className="border-red-500 text-red-500">삭제</Badge>;
    }
    return <Badge variant="outline">{actionType}</Badge>;
  };

  const getUserTypeBadge = (userType: string) => {
    if (userType === "student") return <Badge variant="secondary">학생</Badge>;
    if (userType === "teacher") return <Badge variant="secondary">교사</Badge>;
    if (userType === "admin") return <Badge variant="secondary">관리자</Badge>;
    if (userType === "system") return <Badge variant="outline">시스템</Badge>;
    return <Badge variant="outline">{userType}</Badge>;
  };

  const handleDeleteOldLogs = async (daysOld: number) => {
    if (!confirm(`${daysOld}일 이전의 로그를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) {
      return;
    }

    try {
      setIsDeleting(true);
      const authUser = localStorage.getItem("auth_user");
      if (!authUser) {
        toast.error("관리자 인증이 필요합니다");
        return;
      }

      const user = JSON.parse(authUser);
      if (user.type !== "admin") {
        toast.error("관리자 권한이 필요합니다");
        return;
      }

      const { data: deletedCount, error } = await supabase.rpc("delete_old_audit_logs", {
        p_admin_id: user.id,
        p_days_old: daysOld
      });

      if (error) throw error;

      toast.success(`${deletedCount}건의 로그가 삭제되었습니다`);
      fetchLogs(); // 목록 새로고침
    } catch (error: any) {
      console.error("Error deleting logs:", error);
      toast.error("로그 삭제에 실패했습니다");
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch = 
      log.user_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.table_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.error_message?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAction = actionFilter === "all" || log.action_type === actionFilter;
    const matchesUserType = userTypeFilter === "all" || log.user_type === userTypeFilter;

    return matchesSearch && matchesAction && matchesUserType;
  });

  const loginFailures = logs.filter(log => log.action_type === "login_failed").length;
  const loginSuccesses = logs.filter(log => log.action_type === "login_success").length;
  const dataChanges = logs.filter(log => ["insert", "update", "delete"].includes(log.action_type)).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">로그인 실패</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loginFailures}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">로그인 성공</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loginSuccesses}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">데이터 변경</CardTitle>
            <Shield className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dataChanges}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>보안 감사 로그</CardTitle>
              <CardDescription>
                시스템의 모든 로그인 시도와 데이터 변경 이력을 확인할 수 있습니다
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDeleteOldLogs(90)}
                disabled={isDeleting}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                90일 이전 삭제
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDeleteOldLogs(30)}
                disabled={isDeleting}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                30일 이전 삭제
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="사용자 ID, 테이블명, 오류 메시지 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="활동 유형" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 활동</SelectItem>
                <SelectItem value="login_success">로그인 성공</SelectItem>
                <SelectItem value="login_failed">로그인 실패</SelectItem>
                <SelectItem value="insert">추가</SelectItem>
                <SelectItem value="update">수정</SelectItem>
                <SelectItem value="delete">삭제</SelectItem>
              </SelectContent>
            </Select>
            <Select value={userTypeFilter} onValueChange={setUserTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="사용자 유형" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 사용자</SelectItem>
                <SelectItem value="student">학생</SelectItem>
                <SelectItem value="teacher">교사</SelectItem>
                <SelectItem value="admin">관리자</SelectItem>
                <SelectItem value="system">시스템</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>시간</TableHead>
                  <TableHead>사용자 유형</TableHead>
                  <TableHead>사용자 ID</TableHead>
                  <TableHead>활동</TableHead>
                  <TableHead>테이블</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>오류 메시지</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">
                      로딩 중...
                    </TableCell>
                  </TableRow>
                ) : filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">
                      로그가 없습니다
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">
                        {format(new Date(log.created_at), "yyyy-MM-dd HH:mm:ss", { locale: ko })}
                      </TableCell>
                      <TableCell>{getUserTypeBadge(log.user_type)}</TableCell>
                      <TableCell className="font-mono text-sm">{log.user_id}</TableCell>
                      <TableCell>{getActionBadge(log.action_type, log.status)}</TableCell>
                      <TableCell className="font-mono text-sm">{log.table_name || "-"}</TableCell>
                      <TableCell>
                        {log.status === "success" ? (
                          <Badge variant="outline" className="border-green-500 text-green-500">성공</Badge>
                        ) : (
                          <Badge variant="destructive">실패</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                        {log.error_message || "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
