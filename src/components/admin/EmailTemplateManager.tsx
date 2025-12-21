import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import EmailSender from "./EmailSender";

interface EmailTemplate {
  id: string;
  title: string;
  subject: string;
  body: string;
  template_type: 'email' | 'messenger';
  created_at: string;
}

const EmailTemplateManager = () => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    subject: "",
    body: "",
    template_type: "email" as "email" | "messenger",
  });
  const [filterType, setFilterType] = useState<'all' | 'email' | 'messenger'>('all');

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const authUser = localStorage.getItem("auth_user");
      if (!authUser) return;

      const user = JSON.parse(authUser);

      const { data, error } = await supabase.rpc("admin_get_email_templates", {
        admin_id_input: user.id,
        filter_type: filterType === 'all' ? null : filterType,
      });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      toast.error("템플릿 로드 실패: " + error.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const authUser = localStorage.getItem("auth_user");
      if (!authUser) {
        toast.error("로그인이 필요합니다");
        return;
      }

      const user = JSON.parse(authUser);

      if (editingTemplate) {
        // Update existing template using RPC
        const { error } = await supabase.rpc("admin_update_email_template", {
          admin_id_input: user.id,
          template_id_input: editingTemplate.id,
          title_input: formData.title,
          subject_input: formData.subject,
          body_input: formData.body,
          template_type_input: formData.template_type,
        });

        if (error) throw error;
        toast.success("템플릿이 수정되었습니다");
      } else {
        // Create new template using RPC
        const { error } = await supabase.rpc("admin_insert_email_template", {
          admin_id_input: user.id,
          title_input: formData.title,
          subject_input: formData.subject,
          body_input: formData.body,
          template_type_input: formData.template_type,
        });

        if (error) throw error;
        toast.success("템플릿이 생성되었습니다");
      }

      setIsOpen(false);
      setEditingTemplate(null);
      setFormData({ title: "", subject: "", body: "", template_type: "email" });
      loadTemplates();
    } catch (error: any) {
      toast.error("저장 실패: " + error.message);
    }
  };

  const handleEdit = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setFormData({
      title: template.title,
      subject: template.subject,
      body: template.body,
      template_type: template.template_type,
    });
    setIsOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("정말로 이 템플릿을 삭제하시겠습니까?")) return;

    try {
      const authUser = localStorage.getItem("auth_user");
      if (!authUser) return;

      const user = JSON.parse(authUser);

      const { error } = await supabase.rpc("admin_delete_email_template", {
        admin_id_input: user.id,
        template_id_input: id,
      });

      if (error) throw error;
      toast.success("템플릿이 삭제되었습니다");
      loadTemplates();
    } catch (error: any) {
      toast.error("삭제 실패: " + error.message);
    }
  };

  const handleDialogClose = () => {
    setIsOpen(false);
    setEditingTemplate(null);
    setFormData({ title: "", subject: "", body: "", template_type: "email" });
  };

  // Reload templates when filter changes
  useEffect(() => {
    loadTemplates();
  }, [filterType]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-monthly-green">이메일 템플릿</h3>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => handleDialogClose()}>
              <Plus className="w-4 h-4 mr-1" />
              새 템플릿
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingTemplate ? "템플릿 수정" : "새 템플릿 만들기"}</DialogTitle>
              <DialogDescription>
                이메일 템플릿의 제목, 제목, 본문을 입력하세요
              </DialogDescription>
            </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="template_type">템플릿 유형</Label>
                    <Select
                      value={formData.template_type}
                      onValueChange={(value: "email" | "messenger") => 
                        setFormData({ ...formData, template_type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">이메일</SelectItem>
                        <SelectItem value="messenger">메신저</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="title">템플릿 이름</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="예: 학부모 상담 안내"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="subject">이메일 제목</Label>
                    <Input
                      id="subject"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      placeholder="예: [학부모 상담] 안내 말씀"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="body">이메일 본문</Label>
                    <Textarea
                      id="body"
                      value={formData.body}
                      onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                      placeholder="이메일 본문을 입력하세요..."
                      rows={10}
                      required
                    />
                  </div>
                </div>
                <DialogFooter className="mt-6">
                  <Button type="button" variant="outline" onClick={handleDialogClose}>
                    취소
                  </Button>
                  <Button type="submit">
                    {editingTemplate ? "수정" : "생성"}
                  </Button>
                </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
          <TableHeader>
            <TableRow>
              <TableHead>유형</TableHead>
              <TableHead>템플릿 이름</TableHead>
              <TableHead>제목</TableHead>
              <TableHead>작성일</TableHead>
              <TableHead className="text-right">작업</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  등록된 템플릿이 없습니다
                </TableCell>
              </TableRow>
            ) : (
              templates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                      {template.template_type === 'email' ? '이메일' : '메신저'}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium">{template.title}</TableCell>
                  <TableCell>{template.subject}</TableCell>
                  <TableCell>{new Date(template.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    {template.template_type === 'email' && (
                      <EmailSender 
                        templateId={template.id} 
                        templateTitle={template.title}
                      />
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(template)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(template.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
    </div>
  );
};

export default EmailTemplateManager;
