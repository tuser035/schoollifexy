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
  const [allMessages, setAllMessages] = useState<MindTalkMessage[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [selectedStudentName, setSelectedStudentName] = useState<string>('');
  const [searchText, setSearchText] = useState('');
  const [searchGrade, setSearchGrade] = useState<string>('all');
  const [searchClass, setSearchClass] = useState<string>('all');
  const [studentSearchText, setStudentSearchText] = useState('');
  const [studentSearchGrade, setStudentSearchGrade] = useState<string>('all');
  const [studentSearchClass, setStudentSearchClass] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchAlerts();
    fetchAllMessages();
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

  const fetchAllMessages = async () => {
    try {
      const { data, error } = await supabase.rpc('admin_get_mindtalk_messages', {
        admin_id_input: userId,
        student_id_input: null
      });

      if (error) throw error;
      setAllMessages(data || []);
    } catch (error) {
      console.error('Error fetching all mindtalk messages:', error);
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

  // 전체 메시지에서 학생 목록 추출
  const studentsWithMessages = allMessages.reduce((acc, msg) => {
    if (!acc.find(s => s.student_id === msg.student_id)) {
      acc.push({
        student_id: msg.student_id,
        student_name: msg.student_name,
        student_grade: msg.student_grade,
        student_class: msg.student_class,
        student_number: msg.student_number,
        message_count: allMessages.filter(m => m.student_id === msg.student_id).length,
        last_message_at: allMessages
          .filter(m => m.student_id === msg.student_id)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]?.created_at
      });
    }
    return acc;
  }, [] as Array<{
    student_id: string;
    student_name: string;
    student_grade: number;
    student_class: number;
    student_number: number;
    message_count: number;
    last_message_at: string;
  }>);

  const filteredStudents = studentsWithMessages.filter(student => {
    const matchesText = !studentSearchText || 
      student.student_name?.toLowerCase().includes(studentSearchText.toLowerCase()) ||
      student.student_id?.toLowerCase().includes(studentSearchText.toLowerCase());
    const matchesGrade = studentSearchGrade === 'all' || student.student_grade === parseInt(studentSearchGrade);
    const matchesClass = studentSearchClass === 'all' || student.student_class === parseInt(studentSearchClass);
    return matchesText && matchesGrade && matchesClass;
  }).sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());

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
              {/* Student Search Filters */}
              <div className="flex flex-wrap gap-2">
                <div className="flex-1 min-w-[200px]">
                  <Input
                    placeholder="학생 이름 또는 학번 검색"
                    value={studentSearchText}
                    onChange={(e) => setStudentSearchText(e.target.value)}
                  />
                </div>
                <Select value={studentSearchGrade} onValueChange={setStudentSearchGrade}>
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
                <Select value={studentSearchClass} onValueChange={setStudentSearchClass}>
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
                <Button onClick={fetchAllMessages} variant="outline">
                  새로고침
                </Button>
              </div>

              {/* Students with Messages Table */}
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>학생</TableHead>
                      <TableHead>학년/반/번</TableHead>
                      <TableHead>대화 수</TableHead>
                      <TableHead>마지막 대화</TableHead>
                      <TableHead>대화 조회</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          마음톡 대화 기록이 없습니다
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredStudents.map((student) => (
                        <TableRow key={student.student_id}>
                          <TableCell className="font-medium">{student.student_name || '-'}</TableCell>
                          <TableCell>
                            {student.student_grade}-{student.student_class}-{student.student_number}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{student.message_count}개</Badge>
                          </TableCell>
                          <TableCell>
                            {student.last_message_at 
                              ? format(new Date(student.last_message_at), 'MM/dd HH:mm', { locale: ko })
                              : '-'}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => fetchStudentMessages(student.student_id, student.student_name || '')}
                            >
                              대화보기
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              <p className="text-sm text-muted-foreground">
                * 마음톡을 사용한 학생만 목록에 표시됩니다 ({filteredStudents.length}명)
              </p>
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
