import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Download, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface EdufineDocument {
  id: string;
  rcv_date: string | null;
  due: string | null;
  dept: string | null;
  subj: string | null;
  doc_no: string | null;
  att1: string | null;
  att2: string | null;
  att3: string | null;
  att4: string | null;
  att5: string | null;
  file_url: string | null;
  created_at: string;
}

const EdufineInquiry = () => {
  const [documents, setDocuments] = useState<EdufineDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const authUser = localStorage.getItem("auth_user");
      if (!authUser) {
        toast.error("로그인이 필요합니다");
        return;
      }

      const user = JSON.parse(authUser);
      await supabase.rpc("set_admin_session", { admin_id_input: user.id });

      let query = supabase
        .from("edufine_documents")
        .select("*")
        .order("created_at", { ascending: false });

      if (searchText.trim()) {
        query = query.or(
          `dept.ilike.%${searchText}%,subj.ilike.%${searchText}%,doc_no.ilike.%${searchText}%`
        );
      }

      const { data, error } = await query;

      if (error) throw error;

      setDocuments(data || []);
    } catch (error: any) {
      console.error("조회 오류:", error);
      toast.error("문서 조회 중 오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("이 문서를 삭제하시겠습니까?")) return;

    try {
      const authUser = localStorage.getItem("auth_user");
      if (!authUser) {
        toast.error("로그인이 필요합니다");
        return;
      }

      const user = JSON.parse(authUser);
      await supabase.rpc("set_admin_session", { admin_id_input: user.id });

      const { error } = await supabase
        .from("edufine_documents")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("문서가 삭제되었습니다");
      fetchDocuments();
    } catch (error: any) {
      console.error("삭제 오류:", error);
      toast.error("문서 삭제 중 오류가 발생했습니다");
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>에듀파인 문서 조회</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="발신부서, 제목, 문서번호로 검색..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchDocuments()}
          />
          <Button onClick={fetchDocuments} disabled={loading}>
            <Search className="h-4 w-4 mr-2" />
            검색
          </Button>
        </div>

        <div className="border rounded-lg overflow-auto max-h-[600px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>접수일</TableHead>
                <TableHead>마감일</TableHead>
                <TableHead>발신부서</TableHead>
                <TableHead>제목</TableHead>
                <TableHead>문서번호</TableHead>
                <TableHead>붙임파일</TableHead>
                <TableHead>작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    로딩 중...
                  </TableCell>
                </TableRow>
              ) : documents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    조회된 문서가 없습니다
                  </TableCell>
                </TableRow>
              ) : (
                documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>{doc.rcv_date || "-"}</TableCell>
                    <TableCell>{doc.due || "-"}</TableCell>
                    <TableCell>{doc.dept || "-"}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {doc.subj || "-"}
                    </TableCell>
                    <TableCell>{doc.doc_no || "-"}</TableCell>
                    <TableCell>
                      <div className="text-xs space-y-1">
                        {[doc.att1, doc.att2, doc.att3, doc.att4, doc.att5]
                          .filter(Boolean)
                          .map((att, idx) => (
                            <div key={idx} className="truncate max-w-[200px]">
                              {att}
                            </div>
                          ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {doc.file_url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(doc.file_url!, "_blank")}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(doc.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="text-sm text-muted-foreground">
          총 {documents.length}개의 문서
        </div>
      </CardContent>
    </Card>
  );
};

export default EdufineInquiry;
