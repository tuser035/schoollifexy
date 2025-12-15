import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Save, Trash2, Search, Pencil, Check, X, UserPlus, UserMinus, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSync, TableSubscription } from "@/hooks/use-realtime-sync";

interface Teacher {
  id?: string;
  name: string;
  call_t: string;
  teacher_email: string;
  grade: number | null;
  class: number | null;
  is_homeroom: boolean;
  department: string;
  subject: string;
}

interface TeacherGroup {
  id: string;
  group_name: string;
  teacher_ids: string[];
  created_at: string;
}

const TeacherGroupManager = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [groups, setGroups] = useState<TeacherGroup[]>([]);
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([]);
  const [groupName, setGroupName] = useState("");
  const [searchName, setSearchName] = useState<string>("");
  const [searchDepartment, setSearchDepartment] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadedGroupTeachers, setLoadedGroupTeachers] = useState<Teacher[]>([]);
  const [loadedGroupName, setLoadedGroupName] = useState<string>("");
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState<string>("");
  const [editingMembersGroupId, setEditingMembersGroupId] = useState<string | null>(null);
  const [editingMembersGroup, setEditingMembersGroup] = useState<TeacherGroup | null>(null);
  const [viewingGroupOnly, setViewingGroupOnly] = useState(false);
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [expandedGroupMembers, setExpandedGroupMembers] = useState<Teacher[]>([]);

  const authUser = localStorage.getItem("auth_user");
  const user = authUser ? JSON.parse(authUser) : null;

  const loadTeachers = async () => {
    try {
      if (!user) return;
      
      const { data, error } = await supabase.rpc("admin_get_teachers", {
        admin_id_input: user.id,
        search_text: searchName || null,
        search_grade: null,
        search_class: null,
        search_department: null,
        search_subject: null,
        search_dept_name: null,
        search_homeroom: null,
      });

      if (error) throw error;
      setTeachers(data || []);
    } catch (error: any) {
      console.error("Error loading teachers:", error);
      toast.error("교사 목록 조회 실패: " + error.message);
    }
  };

  const loadGroups = async () => {
    try {
      if (!user) return;
      
      // RPC 함수를 사용하여 교사 그룹 조회
      const { data, error } = await supabase.rpc("teacher_get_own_teacher_groups", {
        teacher_id_input: user.id,
      });

      if (error) throw error;
      setGroups(data || []);
    } catch (error: any) {
      console.error("Error loading groups:", error);
      toast.error("그룹 목록 조회 실패: " + error.message);
    }
  };

  const groupTables: TableSubscription[] = user ? [
    {
      channelName: "teacher-group-manager",
      table: "teacher_groups",
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
    loadTeachers();
    loadGroups();
  }, [searchName]);

  const handleTeacherToggle = (teacherEmail: string) => {
    setSelectedTeachers(prev =>
      prev.includes(teacherEmail)
        ? prev.filter(email => email !== teacherEmail)
        : [...prev, teacherEmail]
    );
  };

  const filteredTeachers = (() => {
    if (viewingGroupOnly && loadedGroupTeachers.length > 0) {
      if (!searchName.trim()) return loadedGroupTeachers;
      const term = searchName.trim().toLowerCase();
      return loadedGroupTeachers.filter(t => 
        t.name.toLowerCase().includes(term) || t.call_t.includes(term)
      );
    }
    
    let result = teachers;
    if (searchDepartment && searchDepartment !== "all") {
      result = result.filter(t => t.department === searchDepartment);
    }
    return result;
  })();

  const handleSelectAll = () => {
    const allFilteredEmails = filteredTeachers.map(t => t.teacher_email);
    const allSelected = allFilteredEmails.every(email => selectedTeachers.includes(email));
    
    if (allSelected) {
      setSelectedTeachers(prev => prev.filter(email => !allFilteredEmails.includes(email)));
    } else {
      setSelectedTeachers(prev => [...new Set([...prev, ...allFilteredEmails])]);
    }
  };

  const handleSaveGroup = async () => {
    if (!groupName.trim()) {
      toast.error("그룹 이름을 입력하세요");
      return;
    }

    if (selectedTeachers.length === 0) {
      toast.error("교사를 선택하세요");
      return;
    }

    try {
      setIsLoading(true);
      if (!user) return;

      const { data: newGroupId, error } = await supabase.rpc("admin_insert_teacher_group", {
        admin_id_input: user.id,
        group_name_input: groupName,
        teacher_ids_input: selectedTeachers,
      });

      if (error) throw error;

      // 저장된 그룹을 즉시 목록에 추가
      const newGroup: TeacherGroup = {
        id: newGroupId,
        group_name: groupName,
        teacher_ids: selectedTeachers,
        created_at: new Date().toISOString(),
      };
      setGroups(prev => [newGroup, ...prev]);

      toast.success(`그룹 "${groupName}" 저장 완료 (${selectedTeachers.length}명)`);
      setGroupName("");
      setSelectedTeachers([]);
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
      if (!user) return;

      await supabase.rpc('set_teacher_session', { teacher_id_input: user.id });

      const { error } = await supabase
        .from("teacher_groups")
        .delete()
        .eq("id", groupId)
        .eq("admin_id", user.id);

      if (error) throw error;

      // 삭제된 그룹을 즉시 목록에서 제거
      setGroups(prev => prev.filter(g => g.id !== groupId));
      
      // 확장된 그룹이 삭제된 경우 닫기
      if (expandedGroupId === groupId) {
        setExpandedGroupId(null);
        setExpandedGroupMembers([]);
      }

      toast.success(`그룹 "${groupName}" 삭제 완료`);
    } catch (error: any) {
      console.error("Error deleting group:", error);
      toast.error("그룹 삭제 실패: " + error.message);
    }
  };

  const handleLoadGroup = async (group: TeacherGroup) => {
    setSelectedTeachers(group.teacher_ids);
    setGroupName(group.group_name);
    setLoadedGroupName(group.group_name);
    
    try {
      if (!user) return;
      
      const { data, error } = await supabase.rpc("admin_get_teachers", {
        admin_id_input: user.id,
        search_text: null,
        search_grade: null,
        search_class: null,
        search_department: null,
        search_subject: null,
        search_dept_name: null,
        search_homeroom: null,
      });

      if (error) throw error;
      
      const groupTeachers = (data || []).filter((t: Teacher) => 
        group.teacher_ids.includes(t.teacher_email)
      );
      setLoadedGroupTeachers(groupTeachers);
      setViewingGroupOnly(true);
      setSearchName("");
      setSearchDepartment("");
      toast.success(`"${group.group_name}" 그룹 멤버 ${groupTeachers.length}명 표시`);
    } catch (error: any) {
      console.error("Error loading group teachers:", error);
      toast.error("그룹 교사 조회 실패: " + error.message);
    }
  };

  const handleClearLoadedGroup = () => {
    setLoadedGroupTeachers([]);
    setLoadedGroupName("");
    setSelectedTeachers([]);
    setGroupName("");
    setViewingGroupOnly(false);
  };

  const handleToggleGroupExpand = async (group: TeacherGroup) => {
    if (expandedGroupId === group.id) {
      setExpandedGroupId(null);
      setExpandedGroupMembers([]);
      return;
    }

    try {
      if (!user) return;
      
      const { data, error } = await supabase.rpc("admin_get_teachers", {
        admin_id_input: user.id,
        search_text: null,
        search_grade: null,
        search_class: null,
        search_department: null,
        search_subject: null,
        search_dept_name: null,
        search_homeroom: null,
      });

      if (error) throw error;
      
      const groupTeachers = (data || []).filter((t: Teacher) => 
        group.teacher_ids.includes(t.teacher_email)
      );
      setExpandedGroupId(group.id);
      setExpandedGroupMembers(groupTeachers);
    } catch (error: any) {
      console.error("Error loading group teachers:", error);
      toast.error("그룹 멤버 조회 실패: " + error.message);
    }
  };

  const handleStartEditGroup = (group: TeacherGroup) => {
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
      if (!user) return;

      await supabase.rpc('set_teacher_session', { teacher_id_input: user.id });

      const { error } = await supabase
        .from("teacher_groups")
        .update({ group_name: editingGroupName.trim() })
        .eq("id", groupId)
        .eq("admin_id", user.id);

      if (error) throw error;

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

  const handleStartEditMembers = (group: TeacherGroup) => {
    setEditingMembersGroupId(group.id);
    setEditingMembersGroup(group);
    setSelectedTeachers(group.teacher_ids);
  };

  const handleCancelEditMembers = () => {
    setEditingMembersGroupId(null);
    setEditingMembersGroup(null);
    setSelectedTeachers([]);
  };

  const handleSaveEditMembers = async () => {
    if (!editingMembersGroup) return;

    if (selectedTeachers.length === 0) {
      toast.error("최소 1명 이상의 교사를 선택하세요");
      return;
    }

    try {
      setIsLoading(true);
      if (!user) return;

      await supabase.rpc('set_teacher_session', { teacher_id_input: user.id });

      const { error } = await supabase
        .from("teacher_groups")
        .update({ teacher_ids: selectedTeachers })
        .eq("id", editingMembersGroup.id)
        .eq("admin_id", user.id);

      if (error) throw error;

      setGroups(prev => prev.map(g => 
        g.id === editingMembersGroup.id 
          ? { ...g, teacher_ids: selectedTeachers } 
          : g
      ));

      toast.success(`그룹 "${editingMembersGroup.group_name}" 멤버가 수정되었습니다 (${selectedTeachers.length}명)`);
      setEditingMembersGroupId(null);
      setEditingMembersGroup(null);
      setSelectedTeachers([]);
    } catch (error: any) {
      console.error("Error updating group members:", error);
      toast.error("그룹 멤버 수정 실패: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // 고정 부서 목록
  const departments = [
    "교무기획부", "교육과정부", "교육연구부", "교육정보부", 
    "도제교육부", "산학협력부", "진로직업부", "취업지원부", 
    "환경체육부", "학생생활안전부", "행정실", "교무행정", 
    "전임코치", "도제전담", "취업지원", "사감", "당직실"
  ];

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
              아래에서 교사를 선택/해제하여 그룹 멤버를 수정하세요. 현재 {selectedTeachers.length}명 선택됨
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base sm:text-lg">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 sm:w-5 sm:h-5" />
              {viewingGroupOnly ? `"${loadedGroupName}" 그룹 멤버` : "교사 선택"}
            </div>
            {viewingGroupOnly && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleClearLoadedGroup}
              >
                전체 교사 보기
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4">
          {/* 그룹 멤버 보기 모드가 아닐 때만 필터 표시 */}
          {!viewingGroupOnly && (
            <div className="grid grid-cols-2 gap-2 sm:gap-4">
              <div>
                <Label className="text-sm">이름 검색</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="교사 이름으로 검색..."
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>
              </div>
              <div>
                <Label className="text-sm">부서</Label>
                <Select value={searchDepartment || "all"} onValueChange={(v) => setSearchDepartment(v === "all" ? "" : v)}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="전체" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    {departments.map(dept => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={handleSelectAll} disabled={viewingGroupOnly}>
              {selectedTeachers.length === filteredTeachers.length && filteredTeachers.length > 0 ? "전체 해제" : "전체 선택"}
            </Button>
            <span className="text-sm text-muted-foreground">
              {viewingGroupOnly 
                ? `${filteredTeachers.length}명 (그룹 멤버)` 
                : `${selectedTeachers.length}명 선택됨 / ${filteredTeachers.length}명 표시`}
            </span>
          </div>

          <div className="max-h-96 overflow-y-auto border rounded-lg p-4 space-y-2">
            {filteredTeachers.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                {searchName ? "검색 결과가 없습니다" : "교사가 없습니다"}
              </p>
            ) : filteredTeachers.map(teacher => (
              <div
                key={teacher.teacher_email}
                className={`flex items-center space-x-2 p-2 hover:bg-accent rounded ${
                  editingMembersGroup && selectedTeachers.includes(teacher.teacher_email) 
                    ? "bg-orange-100 dark:bg-orange-900/30" 
                    : viewingGroupOnly
                    ? "bg-primary/5"
                    : ""
                }`}
              >
                <Checkbox
                  id={teacher.teacher_email}
                  checked={selectedTeachers.includes(teacher.teacher_email)}
                  onCheckedChange={() => handleTeacherToggle(teacher.teacher_email)}
                  disabled={viewingGroupOnly && !editingMembersGroup}
                />
                <label
                  htmlFor={teacher.teacher_email}
                  className="text-xs sm:text-sm cursor-pointer flex-1"
                >
                  <span className="font-medium">{teacher.name}</span>
                  <span className="text-muted-foreground ml-2">
                    ({teacher.department || "-"} / {teacher.subject || "-"})
                  </span>
                </label>
              </div>
            ))}
          </div>

          {/* 그룹 저장 (새 그룹 생성 시에만) */}
          {!editingMembersGroup && !viewingGroupOnly && (
            <div className="flex gap-2 pt-2">
              <Input
                placeholder="그룹 이름"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="h-9"
              />
              <Button
                onClick={handleSaveGroup}
                disabled={isLoading || selectedTeachers.length === 0}
                className="h-9 whitespace-nowrap"
              >
                <Save className="w-4 h-4 mr-1" />
                그룹 저장
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 저장된 그룹 목록 */}
      {!viewingGroupOnly && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">저장된 교사 그룹</CardTitle>
          </CardHeader>
          <CardContent>
            {groups.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                저장된 그룹이 없습니다
              </p>
            ) : (
              <div className="space-y-2">
                {groups.map(group => (
                  <div key={group.id} className="bg-accent/50 rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between p-3">
                      {editingGroupId === group.id ? (
                        <div className="flex items-center gap-2 flex-1 mr-2">
                          <Input
                            value={editingGroupName}
                            onChange={(e) => setEditingGroupName(e.target.value)}
                            className="h-8 text-sm"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveEditGroup(group.id);
                              if (e.key === "Escape") handleCancelEditGroup();
                            }}
                            autoFocus
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
                        <>
                          <button
                            onClick={() => handleToggleGroupExpand(group)}
                            className="flex-1 text-left hover:text-primary transition-colors flex items-center gap-2"
                          >
                            {expandedGroupId === group.id ? (
                              <ChevronUp className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            )}
                            <span className="font-medium text-sm sm:text-base">
                              {group.group_name}
                            </span>
                            <span className="text-muted-foreground text-xs sm:text-sm">
                              ({group.teacher_ids.length}명)
                            </span>
                          </button>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleStartEditGroup(group)}
                              className="h-8 w-8 p-0"
                              title="이름 수정"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleStartEditMembers(group)}
                              className="h-8 w-8 p-0"
                              title="멤버 수정"
                            >
                              <UserMinus className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteGroup(group.id, group.group_name)}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                    
                    {/* 확장된 멤버 목록 */}
                    {expandedGroupId === group.id && (
                      <div className="px-3 pb-3 pt-0">
                        <div className="bg-background/80 rounded-md p-2 space-y-1 max-h-48 overflow-y-auto">
                          {expandedGroupMembers.length === 0 ? (
                            <p className="text-center text-muted-foreground text-sm py-2">
                              멤버 정보를 불러오는 중...
                            </p>
                          ) : (
                            expandedGroupMembers.map((teacher, idx) => (
                              <div 
                                key={teacher.teacher_email} 
                                className="flex items-center justify-between text-sm py-1 px-2 hover:bg-accent/50 rounded"
                              >
                                <span className="font-medium">{idx + 1}. {teacher.name}</span>
                                <span className="text-muted-foreground text-xs">
                                  {teacher.department || "-"} / {teacher.subject || "-"}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TeacherGroupManager;
