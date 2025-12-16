import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, AlertTriangle, MessageCircle, User, Bot } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface MindTalkInquiryProps {
  userId: string;
}

interface MindTalkMessage {
  id: string;
  student_id: string;
  student_name: string;
  student_grade: number;
  student_class: number;
  student_number: number;
  role: string;
  content: string;
  created_at: string;
}

interface MindTalkAlert {
  id: string;
  student_id: string;
  student_name: string;
  student_grade: number;
  student_class: number;
  student_number: number;
  dangerous_word_count: number;
  last_alert_sent_at: string | null;
  updated_at: string;
}

const MindTalkInquiry = ({ userId }: MindTalkInquiryProps) => {
  const [alerts, setAlerts] = useState<MindTalkAlert[]>([]);
  const [messages, setMessages] = useState<MindTalkMessage[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [selectedStudentName, setSelectedStudentName] = useState<string>('');
  const [searchText, setSearchText] = useState('');
  const [searchGrade, setSearchGrade] = useState<string>('all');
  const [searchClass, setSearchClass] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchAlerts();
  }, [userId]);

  const fetchAlerts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('admin_get_mindtalk_alerts', {
        admin_id_input: userId
      });

      if (error) throw error;
      setAlerts(data || []);
    } catch (error) {
      console.error('Error fetching mindtalk alerts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStudentMessages = async (studentId: string, studentName: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('admin_get_mindtalk_messages', {
        admin_id_input: userId,
        student_id_input: studentId
      });

      if (error) throw error;
      setMessages(data || []);
      setSelectedStudent(studentId);
      setSelectedStudentName(studentName);
      setDialogOpen(true);
    } catch (error) {
      console.error('Error fetching mindtalk messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    const matchesText = !searchText || 
      alert.student_name?.toLowerCase().includes(searchText.toLowerCase()) ||
      alert.student_id?.toLowerCase().includes(searchText.toLowerCase());
    const matchesGrade = searchGrade === 'all' || alert.student_grade === parseInt(searchGrade);
    const matchesClass = searchClass === 'all' || alert.student_class === parseInt(searchClass);
    return matchesText && matchesGrade && matchesClass;
  });

  const getDangerLevel = (count: number) => {
    if (count >= 9) return { color: 'bg-red-500', label: '위험' };
    if (count >= 6) return { color: 'bg-orange-500', label: '주의' };
    if (count >= 3) return { color: 'bg-yellow-500', label: '관심' };
    return { color: 'bg-blue-500', label: '정상' };
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            마음톡 상담 조회
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="alerts" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="alerts" className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                위험 감지 현황
              </TabsTrigger>
              <TabsTrigger value="search" className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                학생별 대화 조회
              </TabsTrigger>
            </TabsList>

            <TabsContent value="alerts" className="space-y-4">
              {/* Filters */}
              <div className="flex flex-wrap gap-2">
                <div className="flex-1 min-w-[200px]">
                  <Input
                    placeholder="학생 이름 또는 학번 검색"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                  />
                </div>
                <Select value={searchGrade} onValueChange={setSearchGrade}>
                  <SelectTrigger className="w-[100px]">
                    <SelectValue placeholder="학년" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    <SelectItem value="1">1학년</SelectItem>
                    <SelectItem value="2">2학년</SelectItem>
                    <SelectItem value="3">3학년</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={searchClass} onValueChange={setSearchClass}>
                  <SelectTrigger className="w-[100px]">
                    <SelectValue placeholder="반" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    {[1,2,3,4,5,6,7,8,9].map(c => (
                      <SelectItem key={c} value={c.toString()}>{c}반</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={fetchAlerts} variant="outline">
                  새로고침
                </Button>
              </div>

              {/* Alerts Table */}
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>학생</TableHead>
                      <TableHead>학년/반/번</TableHead>
                      <TableHead>위험단어 누적</TableHead>
                      <TableHead>위험도</TableHead>
                      <TableHead>최근 알림</TableHead>
                      <TableHead>대화 조회</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAlerts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          위험 감지 기록이 없습니다
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAlerts.map((alert) => {
                        const danger = getDangerLevel(alert.dangerous_word_count);
                        return (
                          <TableRow key={alert.id}>
                            <TableCell className="font-medium">{alert.student_name || '-'}</TableCell>
                            <TableCell>
                              {alert.student_grade}-{alert.student_class}-{alert.student_number}
                            </TableCell>
                            <TableCell>
                              <span className="font-bold text-red-600">{alert.dangerous_word_count}회</span>
                            </TableCell>
                            <TableCell>
                              <Badge className={danger.color}>{danger.label}</Badge>
                            </TableCell>
                            <TableCell>
                              {alert.last_alert_sent_at 
                                ? format(new Date(alert.last_alert_sent_at), 'MM/dd HH:mm', { locale: ko })
                                : '-'}
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => fetchStudentMessages(alert.student_id, alert.student_name || '')}
                              >
                                대화보기
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="search" className="space-y-4">
              <div className="text-sm text-muted-foreground">
                위험 감지 현황 탭에서 학생을 선택하여 대화 내용을 조회할 수 있습니다.
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Chat History Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              {selectedStudentName} 학생 마음톡 대화 기록
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-3">
              {messages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  대화 기록이 없습니다
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-lg px-3 py-2 ${
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      <p className="text-xs mt-1 opacity-70">
                        {format(new Date(msg.created_at), 'MM/dd HH:mm', { locale: ko })}
                      </p>
                    </div>
                    {msg.role === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                        <User className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MindTalkInquiry;
