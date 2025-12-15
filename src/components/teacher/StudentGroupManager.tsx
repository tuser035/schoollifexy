import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Save, Trash2, Search, Pencil, Check, X, UserPlus, UserMinus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSync, TableSubscription } from "@/hooks/use-realtime-sync";

interface Student {
  student_id: string;
  name: string;
  grade: number;
  class: number;
  number: number;
}

interface StudentGroup {
  id: string;
  group_name: string;
  student_ids: string[];
  created_at: string;
}

const StudentGroupManager = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<StudentGroup[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [groupName, setGroupName] = useState("");
  const [searchGrade, setSearchGrade] = useState<string>("");
  const [searchClass, setSearchClass] = useState<string>("");
  const [searchName, setSearchName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadedGroupStudents, setLoadedGroupStudents] = useState<Student[]>([]);
  const [loadedGroupName, setLoadedGroupName] = useState<string>("");
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState<string>("");
  const [editingMembersGroupId, setEditingMembersGroupId] = useState<string | null>(null);
  const [editingMembersGroup, setEditingMembersGroup] = useState<StudentGroup | null>(null);
  const [viewingGroupOnly, setViewingGroupOnly] = useState(false);

  // 실시간 동기화를 위한 사용자 정보
  const authUser = localStorage.getItem("auth_user");
  const user = authUser ? JSON.parse(authUser) : null;

  const loadStudents = async () => {
    try {
      if (!user) return;
      
      const { data, error } = await supabase.rpc("admin_get_students", {
        admin_id_input: user.id,
        search_grade: searchGrade ? parseInt(searchGrade) : null,
        search_class: searchClass ? parseInt(searchClass) : null,
      });

      if (error) throw error;
      setStudents(data || []);
    } catch (error: any) {
      console.error("Error loading students:", error);
      toast.error("학생 목록 조회 실패: " + error.message);
    }
  };

  const loadGroups = async () => {
    try {
      if (!user) return;
      
      const { data, error } = await supabase.rpc("admin_get_student_groups", {
        admin_id_input: user.id,
      });

      if (error) throw error;
      setGroups(data || []);
    } catch (error: any) {
      console.error("Error loading groups:", error);
      toast.error("그룹 목록 조회 실패: " + error.message);
    }
  };

  // 실시간 동기화를 위한 테이블 구독 설정
  const groupTables: TableSubscription[] = user ? [
    {
      channelName: "student-group-manager",
      table: "student_groups",
      filter: `admin_id=eq.${user.id}`,
      labels: {
        insert: "🔄 새 그룹이 추가되었습니다",
        update: "🔄 그룹이 수정되었습니다",
        delete: "🔄 그룹이 삭제되었습니다",
      },
    },
  ] : [];

  const handleRefresh = useCallback(() => {
    loadGroups();
  }, []);

  useRealtimeSync({
    tables: groupTables,
    onRefresh: handleRefresh,
    enabled: !!user,
  });

  useEffect(() => {
    loadStudents();
    loadGroups();
  }, [searchGrade, searchClass]);

  const handleStudentToggle = (studentId: string) => {
    setSelectedStudents(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  // 이름 검색 필터링 및 그룹 멤버 전용 모드
  const filteredStudents = (() => {
    // 그룹 멤버만 보기 모드일 때는 loadedGroupStudents만 표시
    if (viewingGroupOnly && loadedGroupStudents.length > 0) {
      if (!searchName.trim()) return loadedGroupStudents;
      const term = searchName.trim().toLowerCase();
      return loadedGroupStudents.filter(s => 
        s.name.toLowerCase().includes(term) || s.student_id.includes(term)
      );
    }
    
    // 일반 모드
    if (!searchName.trim()) return students;
    const term = searchName.trim().toLowerCase();
    return students.filter(s => 
      s.name.toLowerCase().includes(term) || s.student_id.includes(term)
    );
  })();

  const handleSelectAll = () => {
    const allFilteredIds = filteredStudents.map(s => s.student_id);
    const allSelected = allFilteredIds.every(id => selectedStudents.includes(id));
    
    if (allSelected) {
      // 현재 필터된 학생들만 선택 해제
      setSelectedStudents(prev => prev.filter(id => !allFilteredIds.includes(id)));
    } else {
      // 현재 필터된 학생들 추가 (기존 선택 유지)
      setSelectedStudents(prev => [...new Set([...prev, ...allFilteredIds])]);
    }
  };

  const handleSaveGroup = async () => {
    if (!groupName.trim()) {
      toast.error("그룹 이름을 입력하세요");
      return;
    }

    if (selectedStudents.length === 0) {
      toast.error("학생을 선택하세요");
      return;
    }

    try {
      setIsLoading(true);
      const authUser = localStorage.getItem("auth_user");
      if (!authUser) return;

      const user = JSON.parse(authUser);

      const { error } = await supabase.rpc("admin_insert_student_group", {
        admin_id_input: user.id,
        group_name_input: groupName,
        student_ids_input: selectedStudents,
      });

      if (error) throw error;

      toast.success(`그룹 "${groupName}" 저장 완료 (${selectedStudents.length}명)`);
      setGroupName("");
      setSelectedStudents([]);
      loadGroups();
    } catch (error: any) {
      console.error("Error saving group:", error);
      toast.error("그룹 저장 실패: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteGroup = async (groupId: string, groupName: string) => {
    if (!confirm(`"${groupName}" 그룹을 삭제하시겠습니까?`)) return;

    try {
      const authUser = localStorage.getItem("auth_user");
      if (!authUser) return;

      const user = JSON.parse(authUser);

      const { error } = await supabase
        .from("student_groups")
        .delete()
        .eq("id", groupId)
        .eq("admin_id", user.id);

      if (error) throw error;

      toast.success(`그룹 "${groupName}" 삭제 완료`);
      loadGroups();
    } catch (error: any) {
      console.error("Error deleting group:", error);
      toast.error("그룹 삭제 실패: " + error.message);
    }
  };

  const handleLoadGroup = async (group: StudentGroup) => {
    setSelectedStudents(group.student_ids);
    setGroupName(group.group_name);
    setLoadedGroupName(group.group_name);
    
    // 그룹에 속한 학생들의 상세 정보 조회
    try {
      const authUser = localStorage.getItem("auth_user");
      if (!authUser) return;

      const user = JSON.parse(authUser);
      
      const { data, error } = await supabase.rpc("admin_get_students", {
        admin_id_input: user.id,
      });

      if (error) throw error;
      
      // 그룹에 속한 학생들만 필터링
      const groupStudents = (data || []).filter((s: Student) => 
        group.student_ids.includes(s.student_id)
      );
      setLoadedGroupStudents(groupStudents);
      // 그룹 멤버만 표시 모드 활성화
      setViewingGroupOnly(true);
      // 필터 초기화
      setSearchGrade("");
      setSearchClass("");
      setSearchName("");
      toast.success(`"${group.group_name}" 그룹 멤버 ${groupStudents.length}명 표시`);
    } catch (error: any) {
      console.error("Error loading group students:", error);
      toast.error("그룹 학생 조회 실패: " + error.message);
    }
  };

  const handleClearLoadedGroup = () => {
    setLoadedGroupStudents([]);
    setLoadedGroupName("");
    setSelectedStudents([]);
    setGroupName("");
    setViewingGroupOnly(false);
  };

  const handleStartEditGroup = (group: StudentGroup) => {
    setEditingGroupId(group.id);
    setEditingGroupName(group.group_name);
  };

  const handleCancelEditGroup = () => {
    setEditingGroupId(null);
    setEditingGroupName("");
  };

  const handleSaveEditGroup = async (groupId: string) => {
    if (!editingGroupName.trim()) {
      toast.error("그룹 이름을 입력하세요");
      return;
    }

    try {
      const authUser = localStorage.getItem("auth_user");
      if (!authUser) return;

      const user = JSON.parse(authUser);

      // Set session for RLS
      await supabase.rpc('set_teacher_session', { teacher_id_input: user.id });

      const { error } = await supabase
        .from("student_groups")
        .update({ group_name: editingGroupName.trim() })
        .eq("id", groupId)
        .eq("admin_id", user.id);

      if (error) throw error;

      // 즉시 로컬 상태 업데이트하여 변경된 이름 표시
      const newName = editingGroupName.trim();
      setGroups(prev => prev.map(g => 
        g.id === groupId ? { ...g, group_name: newName } : g
      ));

      toast.success(`그룹 이름이 "${newName}"(으)로 변경되었습니다`);
      setEditingGroupId(null);
      setEditingGroupName("");
    } catch (error: any) {
      console.error("Error updating group:", error);
      toast.error("그룹 이름 변경 실패: " + error.message);
    }
  };

  const handleStartEditMembers = (group: StudentGroup) => {
    setEditingMembersGroupId(group.id);
    setEditingMembersGroup(group);
    setSelectedStudents(group.student_ids);
  };

  const handleCancelEditMembers = () => {
    setEditingMembersGroupId(null);
    setEditingMembersGroup(null);
    setSelectedStudents([]);
  };

  const handleSaveEditMembers = async () => {
    if (!editingMembersGroup) return;

    if (selectedStudents.length === 0) {
      toast.error("최소 1명 이상의 학생을 선택하세요");
      return;
    }

    try {
      setIsLoading(true);
      const authUser = localStorage.getItem("auth_user");
      if (!authUser) return;

      const user = JSON.parse(authUser);

      // Set session for RLS
      await supabase.rpc('set_teacher_session', { teacher_id_input: user.id });

      const { error } = await supabase
        .from("student_groups")
        .update({ student_ids: selectedStudents })
        .eq("id", editingMembersGroup.id)
        .eq("admin_id", user.id);

      if (error) throw error;

      // 로컬 상태 업데이트
      setGroups(prev => prev.map(g => 
        g.id === editingMembersGroup.id 
          ? { ...g, student_ids: selectedStudents } 
          : g
      ));

      toast.success(`그룹 "${editingMembersGroup.group_name}" 멤버가 수정되었습니다 (${selectedStudents.length}명)`);
      setEditingMembersGroupId(null);
      setEditingMembersGroup(null);
      setSelectedStudents([]);
    } catch (error: any) {
      console.error("Error updating group members:", error);
      toast.error("그룹 멤버 수정 실패: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">

      {/* 멤버 수정 모드 표시 */}
      {editingMembersGroup && (
        <Card className="border-orange-500/50 bg-orange-50 dark:bg-orange-950/20">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg text-orange-600 dark:text-orange-400">
                <UserPlus className="w-4 h-4 sm:w-5 sm:h-5" />
                "{editingMembersGroup.group_name}" 멤버 수정 중
              </CardTitle>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleCancelEditMembers}
                  className="border-orange-500/50"
                >
                  취소
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleSaveEditMembers}
                  disabled={isLoading}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  <Save className="w-4 h-4 mr-1" />
                  저장
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              아래에서 학생을 선택/해제하여 그룹 멤버를 수정하세요. 현재 {selectedStudents.length}명 선택됨
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base sm:text-lg">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 sm:w-5 sm:h-5" />
              {viewingGroupOnly ? `"${loadedGroupName}" 그룹 멤버` : "학생 선택"}
            </div>
            {viewingGroupOnly && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleClearLoadedGroup}
              >
                전체 학생 보기
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4">
          {/* 그룹 멤버 보기 모드가 아닐 때만 필터 표시 */}
          {!viewingGroupOnly && (
            <div className="grid grid-cols-2 gap-2 sm:gap-4">
              <div>
                <Label className="text-sm">학년</Label>
                <Select value={searchGrade || "all"} onValueChange={(v) => setSearchGrade(v === "all" ? "" : v)}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="전체" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    <SelectItem value="1">1학년</SelectItem>
                    <SelectItem value="2">2학년</SelectItem>
                    <SelectItem value="3">3학년</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">반</Label>
                <Select value={searchClass || "all"} onValueChange={(v) => setSearchClass(v === "all" ? "" : v)}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="전체" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                      <SelectItem key={num} value={num.toString()}>
                        {num}반
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* 이름 검색 */}
          <div>
            <Label className="text-sm">학생 이름 검색</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="학생 이름으로 검색..."
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={handleSelectAll} disabled={viewingGroupOnly}>
              {selectedStudents.length === filteredStudents.length && filteredStudents.length > 0 ? "전체 해제" : "전체 선택"}
            </Button>
            <span className="text-sm text-muted-foreground">
              {viewingGroupOnly 
                ? `${filteredStudents.length}명 (그룹 멤버)` 
                : `${selectedStudents.length}명 선택됨 / ${filteredStudents.length}명 표시`}
            </span>
          </div>

          <div className="max-h-96 overflow-y-auto border rounded-lg p-4 space-y-2">
            {filteredStudents.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                {searchName ? "검색 결과가 없습니다" : "학생이 없습니다"}
              </p>
            ) : [...filteredStudents]
              .sort((a, b) => a.grade - b.grade || a.class - b.class || a.number - b.number)
              .map(student => (
              <div
                key={student.student_id}
                className={`flex items-center space-x-2 p-2 hover:bg-accent rounded ${
                  editingMembersGroup && selectedStudents.includes(student.student_id) 
                    ? "bg-orange-100 dark:bg-orange-900/30" 
                    : viewingGroupOnly
                    ? "bg-primary/5"
                    : ""
                }`}
              >
                {viewingGroupOnly ? (
                  <span className="flex-1">
                    {student.grade}-{student.class}-{student.number} {student.name}
                  </span>
                ) : (
                  <>
                    <Checkbox
                      checked={selectedStudents.includes(student.student_id)}
                      onCheckedChange={() => handleStudentToggle(student.student_id)}
                    />
                    <span className="flex-1">
                      {student.grade}-{student.class}-{student.number} {student.name}
                    </span>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* 새 그룹 저장 - 멤버 수정 모드가 아닐 때만 표시 */}
          {!editingMembersGroup && (
            <div className="space-y-2">
              <Label className="text-sm">그룹 이름</Label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  placeholder="예: 1학년 전체, 축구부 등"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="text-sm"
                />
                <Button 
                  onClick={handleSaveGroup} 
                  disabled={isLoading}
                  className="w-full sm:w-auto"
                >
                  <Save className="w-4 h-4 mr-2" />
                  저장
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">저장된 그룹 ({groups.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {groups.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                저장된 그룹이 없습니다
              </p>
            ) : (
              groups.map(group => (
                <div
                  key={group.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg hover:bg-accent gap-2"
                >
                  <div className="flex-1">
                    {editingGroupId === group.id ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editingGroupName}
                          onChange={(e) => setEditingGroupName(e.target.value)}
                          className="h-8 text-sm"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEditGroup(group.id);
                            if (e.key === 'Escape') handleCancelEditGroup();
                          }}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSaveEditGroup(group.id)}
                          className="h-8 w-8 p-0"
                        >
                          <Check className="w-4 h-4 text-green-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCancelEditGroup}
                          className="h-8 w-8 p-0"
                        >
                          <X className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm sm:text-base">{group.group_name}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStartEditGroup(group)}
                          className="h-6 w-6 p-0"
                        >
                          <Pencil className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                        </Button>
                      </div>
                    )}
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {group.student_ids.length}명 • {new Date(group.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleLoadGroup(group)}
                      className="flex-1 sm:flex-none"
                      disabled={editingGroupId === group.id || editingMembersGroupId !== null}
                    >
                      불러오기
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStartEditMembers(group)}
                      className="flex-1 sm:flex-none text-orange-600 border-orange-300 hover:bg-orange-50 hover:text-orange-700 dark:text-orange-400 dark:border-orange-700 dark:hover:bg-orange-950"
                      disabled={editingGroupId === group.id || editingMembersGroupId !== null}
                    >
                      <UserPlus className="w-4 h-4 mr-1" />
                      멤버수정
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteGroup(group.id, group.group_name)}
                      disabled={editingGroupId === group.id || editingMembersGroupId !== null}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentGroupManager;
