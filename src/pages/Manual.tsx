import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { ArrowLeft, BookOpen, Users, GraduationCap, ShieldCheck, HelpCircle, Mail, Download, Search, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import html2pdf from "html2pdf.js";
import { useState, useEffect } from "react";

const Manual = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const results: string[] = [];
      
      // 각 탭의 키워드 매핑
      const tabKeywords: Record<string, string[]> = {
        overview: ['시스템', '개요', '목적', '기능', '학생', '교사', '관리자', '특징'],
        login: ['로그인', '비밀번호', '학번', '전화번호', '이메일', '문제', '해결'],
        student: ['학생', '대시보드', '상점', '벌점', '순위', '리더보드', '포인트', '추천'],
        teacher: ['교사', '상점', '벌점', '부여', '월별', '추천', '데이터', '조회', '메시지', '발송', '첨부파일'],
        admin: ['관리자', '데이터', '조회', '일괄', '업로드', '이메일', '템플릿', '진로상담', '통계', '차트', '리더보드', '비밀번호', '재설정', '파일', '저장소', '첨부파일', 'ZIP'],
        faq: ['FAQ', '자주', '질문', '비밀번호', '수정', '삭제', '포인트', '추천', '업로드', '학번', '실시간', '접근'],
        contact: ['문의', '지원', '학생', '교사', '관리자', '로그인', '성능', '사진', '저장', '오류']
      };

      // 검색어와 일치하는 탭 찾기
      Object.entries(tabKeywords).forEach(([tab, keywords]) => {
        if (keywords.some(keyword => keyword.includes(query) || query.includes(keyword))) {
          results.push(tab);
        }
      });

      setSearchResults(results);
      
      // 검색 결과가 있으면 첫 번째 결과로 이동
      if (results.length > 0) {
        setActiveTab(results[0]);
      }
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const handleClearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleDownloadPDF = async () => {
    try {
      toast.info("PDF 생성 중...", { description: "잠시만 기다려주세요." });
      
      const element = document.getElementById('manual-content');
      if (!element) {
        toast.error("매뉴얼 콘텐츠를 찾을 수 없습니다.");
        return;
      }

      const opt = {
        margin: 10,
        filename: `스쿨포인트상점_사용자매뉴얼_${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
      };

      await html2pdf().set(opt).from(element).save();
      toast.success("PDF 다운로드 완료!", { description: "매뉴얼이 저장되었습니다." });
    } catch (error) {
      console.error("PDF 생성 오류:", error);
      toast.error("PDF 생성 실패", { description: "다시 시도해주세요." });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-orange-50 to-green-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              뒤로 가기
            </Button>
            <Button
              onClick={handleDownloadPDF}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              PDF 다운로드
            </Button>
          </div>
          
          <div className="flex items-center gap-3 mb-4">
            <BookOpen className="w-10 h-10 text-primary" />
            <div>
              <h1 className="text-4xl font-bold">사용자 매뉴얼</h1>
              <p className="text-muted-foreground">스쿨포인트.상점 시스템 사용 가이드</p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative max-w-xl">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="매뉴얼 검색... (예: 상점, 벌점, 이메일, 첨부파일 등)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearSearch}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Search Results */}
          {searchQuery && searchResults.length > 0 && (
            <div className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <p className="text-sm font-medium mb-2">검색 결과 ({searchResults.length}개 섹션)</p>
              <div className="flex flex-wrap gap-2">
                {searchResults.map((tab) => {
                  const tabNames: Record<string, string> = {
                    overview: '개요',
                    login: '로그인',
                    student: '학생용',
                    teacher: '교사용',
                    admin: '관리자용',
                    faq: 'FAQ',
                    contact: '문의'
                  };
                  return (
                    <Button
                      key={tab}
                      variant="secondary"
                      size="sm"
                      onClick={() => setActiveTab(tab)}
                      className="text-xs"
                    >
                      {tabNames[tab]}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          {searchQuery && searchResults.length === 0 && (
            <div className="mt-4 p-4 bg-muted/50 border border-border rounded-lg">
              <p className="text-sm text-muted-foreground">
                "<strong>{searchQuery}</strong>" 에 대한 검색 결과가 없습니다.
              </p>
            </div>
          )}
        </div>

        <div id="manual-content">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-7 mb-6">
            <TabsTrigger value="overview">개요</TabsTrigger>
            <TabsTrigger value="login">로그인</TabsTrigger>
            <TabsTrigger value="student">학생용</TabsTrigger>
            <TabsTrigger value="teacher">교사용</TabsTrigger>
            <TabsTrigger value="admin">관리자용</TabsTrigger>
            <TabsTrigger value="faq">FAQ</TabsTrigger>
            <TabsTrigger value="contact">문의</TabsTrigger>
          </TabsList>

          {/* 시스템 개요 */}
          <TabsContent value="overview">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  시스템 개요
                </CardTitle>
                <CardDescription>스쿨포인트.상점 상벌점 관리 시스템 소개</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold mb-3">시스템 목적</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    스쿨포인트.상점은 학교 내 학생들의 긍정적인 행동을 장려하고 부정적인 행동을 관리하기 위한
                    종합 상벌점 관리 시스템입니다. 교사는 학생의 행동을 실시간으로 기록하고, 학생은 자신의
                    상벌점을 확인하며, 관리자는 전체 시스템을 효율적으로 운영할 수 있습니다.
                  </p>
                </div>

                <Separator />

                <div>
                  <h3 className="text-xl font-semibold mb-3">주요 기능</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Card className="border-student/20">
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <GraduationCap className="w-5 h-5 text-student" />
                          학생 기능
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                          <li>실시간 상벌점 조회</li>
                          <li>상벌점 상세 내역 확인</li>
                          <li>월별 추천 학생 확인</li>
                          <li>리더보드 순위 확인</li>
                        </ul>
                      </CardContent>
                    </Card>

                    <Card className="border-teacher/20">
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Users className="w-5 h-5 text-teacher" />
                          교사 기능
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                          <li>학생 상점 부여</li>
                          <li>학생 벌점 부여</li>
                          <li>월별 추천 학생 등록</li>
                          <li>증빙 사진 첨부</li>
                          <li>학생 데이터 조회</li>
                        </ul>
                      </CardContent>
                    </Card>

                    <Card className="border-admin/20 md:col-span-2">
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <ShieldCheck className="w-5 h-5 text-admin" />
                          관리자 기능
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground grid md:grid-cols-2 gap-x-8">
                          <li>학생/교사 정보 관리</li>
                          <li>상벌점 데이터 조회 및 통계</li>
                          <li>월별 추천 관리</li>
                          <li>진로상담 기록 관리</li>
                          <li>일괄 데이터 업로드</li>
                          <li>이메일 발송 및 템플릿 관리</li>
                          <li>리더보드 관리</li>
                          <li>파일 저장소 관리</li>
                        </ul>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-xl font-semibold mb-3">시스템 특징</h3>
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-primary font-semibold">•</span>
                      <span><strong>실시간 동기화:</strong> 모든 데이터가 실시간으로 업데이트됩니다.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary font-semibold">•</span>
                      <span><strong>역할 기반 접근:</strong> 학생, 교사, 관리자별로 차별화된 기능을 제공합니다.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary font-semibold">•</span>
                      <span><strong>증빙 자료 관리:</strong> 사진 첨부를 통해 투명한 관리가 가능합니다.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary font-semibold">•</span>
                      <span><strong>통계 및 분석:</strong> 다양한 차트와 리포트로 데이터를 시각화합니다.</span>
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 로그인 방법 */}
          <TabsContent value="login">
            <Card>
              <CardHeader>
                <CardTitle>로그인 방법</CardTitle>
                <CardDescription>학생, 교사, 관리자별 로그인 안내</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold mb-3 text-student">학생 로그인</h3>
                  <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                    <li>메인 페이지에서 <strong>"학생"</strong> 탭을 선택합니다.</li>
                    <li><strong>학번</strong>을 입력합니다. (예: 10101)</li>
                    <li><strong>비밀번호</strong>를 입력합니다. (기본값: 12345678)</li>
                    <li><strong>"로그인"</strong> 버튼을 클릭합니다.</li>
                    <li>로그인 성공 시 학생 대시보드로 이동합니다.</li>
                  </ol>
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>💡 팁:</strong> 최초 로그인 시 비밀번호를 변경하는 것을 권장합니다.
                    </p>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-xl font-semibold mb-3 text-teacher">교사 로그인</h3>
                  <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                    <li>메인 페이지에서 <strong>"교사"</strong> 탭을 선택합니다.</li>
                    <li><strong>전화번호</strong>를 입력합니다. (하이픈 없이 숫자만)</li>
                    <li><strong>비밀번호</strong>를 입력합니다. (기본값: 1234qwert)</li>
                    <li><strong>"로그인"</strong> 버튼을 클릭합니다.</li>
                    <li>로그인 성공 시 교사 대시보드로 이동합니다.</li>
                  </ol>
                  <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <p className="text-sm text-orange-800">
                      <strong>⚠️ 주의:</strong> 교사 계정은 학생 정보를 다루므로 비밀번호 관리에 각별히 유의하세요.
                    </p>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-xl font-semibold mb-3 text-admin">관리자 로그인</h3>
                  <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                    <li>메인 페이지에서 <strong>"관리자"</strong> 탭을 선택합니다.</li>
                    <li><strong>이메일</strong>을 입력합니다.</li>
                    <li><strong>비밀번호</strong>를 입력합니다.</li>
                    <li><strong>"로그인"</strong> 버튼을 클릭합니다.</li>
                    <li>로그인 성공 시 관리자 대시보드로 이동합니다.</li>
                  </ol>
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800">
                      <strong>🔒 보안:</strong> 관리자 계정은 시스템 전체를 제어할 수 있으므로 절대 타인과 공유하지 마세요.
                    </p>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-xl font-semibold mb-3">로그인 문제 해결</h3>
                  <div className="space-y-3">
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold mb-2">비밀번호를 잊어버렸어요</h4>
                      <p className="text-sm text-muted-foreground">
                        관리자에게 비밀번호 재설정을 요청하세요. 관리자 대시보드의 "비밀번호 재설정" 메뉴에서 초기화할 수 있습니다.
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold mb-2">학번/전화번호가 등록되지 않았어요</h4>
                      <p className="text-sm text-muted-foreground">
                        관리자에게 문의하여 계정 등록을 요청하세요. 관리자는 "데이터 조회" 메뉴에서 학생/교사를 추가할 수 있습니다.
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold mb-2">로그인이 계속 실패해요</h4>
                      <p className="text-sm text-muted-foreground">
                        입력 정보를 다시 확인하세요. 학생은 학번, 교사는 전화번호(하이픈 제외), 관리자는 이메일을 정확히 입력해야 합니다.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 학생용 가이드 */}
          <TabsContent value="student">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-student" />
                  학생용 가이드
                </CardTitle>
                <CardDescription>학생 대시보드 사용 방법</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold mb-3">대시보드 개요</h3>
                  <p className="text-muted-foreground mb-4">
                    학생 대시보드에서는 자신의 상벌점 현황을 실시간으로 확인할 수 있습니다.
                  </p>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold mb-2">📊 포인트 현황</h4>
                      <p className="text-sm text-muted-foreground">
                        현재 보유한 총 상점, 총 벌점, 순포인트를 한눈에 확인할 수 있습니다.
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold mb-2">🏆 순위 확인</h4>
                      <p className="text-sm text-muted-foreground">
                        학년 또는 반 내에서 나의 순위를 확인하고 다른 학생들과 비교할 수 있습니다.
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-xl font-semibold mb-3">상점 내역 조회</h3>
                  <ol className="list-decimal list-inside space-y-2 text-muted-foreground mb-4">
                    <li>대시보드에서 <strong>"상점 내역"</strong> 섹션을 확인합니다.</li>
                    <li>각 상점 기록에는 다음 정보가 표시됩니다:
                      <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                        <li>부여 날짜 및 시간</li>
                        <li>부여한 교사명</li>
                        <li>상점 카테고리 (예: 봉사활동, 우수 과제 등)</li>
                        <li>상점 점수</li>
                        <li>상세 사유</li>
                        <li>증빙 사진 (있는 경우)</li>
                      </ul>
                    </li>
                    <li>최신 내역이 상단에 표시됩니다.</li>
                  </ol>
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">
                      <strong>✅ 알아두기:</strong> 상점은 긍정적인 행동에 대한 보상입니다. 꾸준히 쌓아서 학기말 시상에 도전하세요!
                    </p>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-xl font-semibold mb-3">벌점 내역 조회</h3>
                  <ol className="list-decimal list-inside space-y-2 text-muted-foreground mb-4">
                    <li>대시보드에서 <strong>"벌점 내역"</strong> 섹션을 확인합니다.</li>
                    <li>각 벌점 기록에는 다음 정보가 표시됩니다:
                      <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                        <li>부여 날짜 및 시간</li>
                        <li>부여한 교사명</li>
                        <li>벌점 카테고리 (예: 지각, 과제 미제출 등)</li>
                        <li>벌점 점수</li>
                        <li>상세 사유</li>
                        <li>증빙 사진 (있는 경우)</li>
                      </ul>
                    </li>
                    <li>최신 내역이 상단에 표시됩니다.</li>
                  </ol>
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      <strong>⚠️ 주의:</strong> 벌점이 누적되면 경고 조치가 있을 수 있으니 주의하세요.
                    </p>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-xl font-semibold mb-3">월별 추천 확인</h3>
                  <ol className="list-decimal list-inside space-y-2 text-muted-foreground mb-4">
                    <li>대시보드에서 <strong>"이달의 추천"</strong> 섹션을 확인합니다.</li>
                    <li>교사가 추천한 경우 다음 정보가 표시됩니다:
                      <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                        <li>추천 연월</li>
                        <li>추천한 교사명</li>
                        <li>추천 카테고리</li>
                        <li>추천 사유</li>
                        <li>증빙 사진</li>
                      </ul>
                    </li>
                  </ol>
                  <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <p className="text-sm text-purple-800">
                      <strong>🌟 축하합니다:</strong> 월별 추천은 특별히 우수한 학생에게만 주어지는 영예입니다!
                    </p>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-xl font-semibold mb-3">리더보드</h3>
                  <p className="text-muted-foreground mb-4">
                    학급 또는 학년 전체 학생들의 순위를 확인할 수 있습니다.
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>순위는 (총 상점 - 총 벌점)으로 계산됩니다.</li>
                    <li>학년 필터로 특정 학년만 볼 수 있습니다.</li>
                    <li>내 순위는 하이라이트로 표시됩니다.</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 교사용 가이드 */}
          <TabsContent value="teacher">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-teacher" />
                  교사용 가이드
                </CardTitle>
                <CardDescription>교사 대시보드 사용 방법</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold mb-3">대시보드 개요</h3>
                  <p className="text-muted-foreground mb-4">
                    교사 대시보드는 세 개의 탭으로 구성되어 있습니다: 상점, 벌점, 월별 추천
                  </p>
                </div>

                <Separator />

                <div>
                  <h3 className="text-xl font-semibold mb-3">상점 부여하기</h3>
                  <ol className="list-decimal list-inside space-y-3 text-muted-foreground">
                    <li><strong>"상점"</strong> 탭을 선택합니다.</li>
                    <li><strong>학번</strong>을 입력합니다. (예: 10101)
                      <p className="text-sm ml-6 mt-1">💡 학번 형식: 학년(1) + 반(2) + 번호(2) 예: 1학년 1반 1번 = 10101</p>
                    </li>
                    <li><strong>카테고리</strong>를 선택합니다:
                      <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                        <li>봉사활동</li>
                        <li>우수 과제</li>
                        <li>수업 참여</li>
                        <li>기타 모범 행동</li>
                      </ul>
                    </li>
                    <li><strong>점수</strong>를 입력합니다. (1-10점 권장)</li>
                    <li><strong>상세 사유</strong>를 작성합니다.</li>
                    <li><strong>증빙 사진</strong>을 첨부합니다. (선택사항)
                      <p className="text-sm ml-6 mt-1">📸 사진은 PNG, JPG, JPEG 형식만 가능하며 최대 5MB까지 업로드할 수 있습니다.</p>
                    </li>
                    <li><strong>"상점 부여"</strong> 버튼을 클릭합니다.</li>
                  </ol>
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">
                      <strong>✅ 모범 사례:</strong> 구체적인 사유를 작성하면 학생이 어떤 행동이 좋았는지 명확히 알 수 있습니다.
                    </p>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-xl font-semibold mb-3">벌점 부여하기</h3>
                  <ol className="list-decimal list-inside space-y-3 text-muted-foreground">
                    <li><strong>"벌점"</strong> 탭을 선택합니다.</li>
                    <li><strong>학번</strong>을 입력합니다.</li>
                    <li><strong>카테고리</strong>를 선택합니다:
                      <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                        <li>지각</li>
                        <li>과제 미제출</li>
                        <li>수업 방해</li>
                        <li>기타 규정 위반</li>
                      </ul>
                    </li>
                    <li><strong>점수</strong>를 입력합니다. (1-10점 권장)
                      <p className="text-sm ml-6 mt-1">⚠️ 경미한 위반은 1-3점, 중대한 위반은 5-10점을 부여하세요.</p>
                    </li>
                    <li><strong>상세 사유</strong>를 작성합니다.</li>
                    <li><strong>증빙 사진</strong>을 첨부합니다. (선택사항)</li>
                    <li><strong>"벌점 부여"</strong> 버튼을 클릭합니다.</li>
                  </ol>
                  <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <p className="text-sm text-orange-800">
                      <strong>⚠️ 유의사항:</strong> 벌점은 교육적 목적으로 부여되어야 합니다. 객관적이고 공정한 기준을 유지하세요.
                    </p>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-xl font-semibold mb-3">월별 추천하기</h3>
                  <ol className="list-decimal list-inside space-y-3 text-muted-foreground">
                    <li><strong>"월별 추천"</strong> 탭을 선택합니다.</li>
                    <li><strong>학번</strong>을 입력합니다.</li>
                    <li><strong>연도</strong>를 입력합니다. (예: 2024)</li>
                    <li><strong>월</strong>을 입력합니다. (1-12)</li>
                    <li><strong>카테고리</strong>를 선택합니다:
                      <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                        <li>성적 우수</li>
                        <li>모범 학생</li>
                        <li>봉사 활동</li>
                        <li>리더십</li>
                        <li>기타</li>
                      </ul>
                    </li>
                    <li><strong>추천 사유</strong>를 상세히 작성합니다.</li>
                    <li><strong>증빙 사진</strong>을 첨부합니다. (필수)
                      <p className="text-sm ml-6 mt-1">📸 월별 추천은 반드시 증빙 사진이 필요합니다.</p>
                    </li>
                    <li><strong>"추천하기"</strong> 버튼을 클릭합니다.</li>
                  </ol>
                  <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <p className="text-sm text-purple-800">
                      <strong>🌟 중요:</strong> 월별 추천은 학생에게 큰 영예이므로 신중하게 선정하고 구체적인 사유를 작성해주세요.
                    </p>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-xl font-semibold mb-3">데이터 조회 및 일괄 메시지 발송</h3>
                  <p className="text-muted-foreground mb-4">
                    교사 대시보드 하단의 <strong>"데이터 조회"</strong> 버튼을 클릭하면 관리자와 유사한 조회 기능을 사용할 수 있습니다.
                  </p>
                  
                  <h4 className="font-semibold mb-2 mt-4">조회 기능</h4>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground mb-4">
                    <li>학생 목록 및 상세 정보</li>
                    <li>상벌점 내역 검색</li>
                    <li>월별 추천 목록</li>
                    <li>리더보드</li>
                  </ul>

                  <h4 className="font-semibold mb-2 mt-4">일괄 메시지 발송</h4>
                  <p className="text-muted-foreground mb-2">
                    학생 조회 화면에서 그룹을 선택하여 여러 학생에게 동시에 메시지를 발송할 수 있습니다.
                  </p>
                  <ol className="list-decimal list-inside space-y-2 text-muted-foreground mb-4">
                    <li><strong>"저장된 그룹 불러오기"</strong>를 클릭하여 미리 저장된 학생 그룹을 선택하거나, 학생 목록에서 개별 선택</li>
                    <li><strong>제목</strong>과 <strong>내용</strong>을 작성합니다.</li>
                    <li><strong>첨부파일 추가</strong> (선택사항):
                      <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                        <li>"파일 선택" 버튼으로 컴퓨터에서 파일 선택</li>
                        <li>"카메라" 버튼으로 사진 촬영 후 첨부</li>
                        <li><strong>여러 개의 파일을 첨부할 수 있습니다</strong></li>
                        <li>첨부파일이 3개 이상인 경우 자동으로 ZIP 파일로 압축되어 발송됩니다</li>
                        <li>ZIP 파일명: 년-월-일-그룹명.zip 형식으로 자동 생성</li>
                        <li>개별 파일 삭제 또는 "전체 삭제" 가능</li>
                      </ul>
                    </li>
                    <li><strong>"일괄메시지 발송"</strong> 버튼을 클릭하여 전송</li>
                  </ol>
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>💡 유용한 기능:</strong> 다중 첨부파일 기능으로 여러 자료를 한 번에 발송할 수 있으며, 
                      자동 ZIP 압축으로 수신자가 편리하게 다운로드할 수 있습니다.
                    </p>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-xl font-semibold mb-3">주의사항</h3>
                  <div className="space-y-3">
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold mb-2">🔒 개인정보 보호</h4>
                      <p className="text-sm text-muted-foreground">
                        학생의 개인정보는 교육 목적으로만 사용하고 외부 유출을 절대 금지합니다.
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold mb-2">⚖️ 공정한 평가</h4>
                      <p className="text-sm text-muted-foreground">
                        상벌점 부여 시 개인적인 감정을 배제하고 객관적인 기준을 유지하세요.
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold mb-2">📝 정확한 기록</h4>
                      <p className="text-sm text-muted-foreground">
                        사유를 구체적으로 작성하여 나중에 확인할 때 명확하게 이해할 수 있도록 하세요.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 관리자용 가이드 */}
          <TabsContent value="admin">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-admin" />
                  관리자용 가이드
                </CardTitle>
                <CardDescription>관리자 대시보드 전체 기능 안내</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold mb-3">대시보드 개요</h3>
                  <p className="text-muted-foreground mb-4">
                    관리자 대시보드는 시스템의 모든 기능에 접근할 수 있는 통합 관리 인터페이스입니다.
                  </p>
                </div>

                <Separator />

                <div>
                  <h3 className="text-xl font-semibold mb-3">1. 데이터 조회</h3>
                  <p className="text-muted-foreground mb-4">
                    학생, 교사, 상벌점, 월별 추천 등 모든 데이터를 조회하고 관리할 수 있습니다.
                  </p>
                  
                  <h4 className="font-semibold mb-2 mt-4">학생 관리 및 일괄 메시지</h4>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground mb-4">
                    <li>학생 목록 조회 (학년/반 필터링)</li>
                    <li>학생 상세 정보 확인 (연락처, 학과 등)</li>
                    <li>학생 추가 (개별 또는 일괄)</li>
                    <li>학생 정보 수정</li>
                    <li>학생별 상벌점 내역 상세 조회</li>
                    <li><strong>일괄 메시지 발송</strong> - 다중 첨부파일 지원</li>
                  </ul>
                  
                  <div className="p-4 border-l-4 border-primary bg-primary/5 rounded mb-4">
                    <h5 className="font-semibold mb-2">📧 일괄 메시지 발송 (다중 첨부파일)</h5>
                    <p className="text-sm text-muted-foreground mb-3">
                      학생 조회 화면에서 그룹을 선택하여 여러 학생에게 동시에 메시지를 발송할 수 있습니다.
                    </p>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                      <li><strong>"저장된 그룹 불러오기"</strong>로 학생 그룹 선택 또는 개별 선택</li>
                      <li>제목과 내용 작성</li>
                      <li><strong>첨부파일 추가:</strong>
                        <ul className="list-disc list-inside ml-6 mt-1 space-y-1">
                          <li>여러 개의 파일을 첨부 가능 (파일 선택/카메라)</li>
                          <li>3개 이상 첨부 시 자동 ZIP 압축</li>
                          <li>ZIP 파일명: 년-월-일-그룹명.zip</li>
                          <li>이메일 본문에 다운로드 링크 포함</li>
                        </ul>
                      </li>
                      <li>"일괄메시지 발송" 버튼 클릭</li>
                    </ol>
                  </div>

                  <h4 className="font-semibold mb-2 mt-4">교사 관리</h4>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground mb-4">
                    <li>교사 목록 조회</li>
                    <li>담임 교사 지정</li>
                    <li>교사 추가 (개별 또는 일괄)</li>
                    <li>교사 정보 수정</li>
                  </ul>

                  <h4 className="font-semibold mb-2 mt-4">상벌점 조회</h4>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>전체 상점/벌점 내역 조회</li>
                    <li>학년/반/학생명으로 필터링</li>
                    <li>날짜별 검색</li>
                    <li>카테고리별 통계</li>
                    <li>증빙 사진 확인</li>
                  </ul>
                </div>

                <Separator />

                <div>
                  <h3 className="text-xl font-semibold mb-3">2. 일괄 업로드</h3>
                  <p className="text-muted-foreground mb-4">
                    Excel 파일을 통해 학생, 교사, 학과 데이터를 대량으로 등록할 수 있습니다.
                  </p>
                  <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                    <li><strong>"일괄 업로드"</strong> 메뉴 선택</li>
                    <li>업로드할 데이터 유형 선택 (학생/교사/학과)</li>
                    <li><strong>"템플릿 다운로드"</strong> 버튼으로 샘플 파일 다운로드</li>
                    <li>템플릿에 맞춰 데이터 입력</li>
                    <li>완성된 Excel 파일 업로드</li>
                    <li>미리보기로 데이터 확인</li>
                    <li><strong>"업로드 완료"</strong> 버튼 클릭</li>
                  </ol>
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>💡 팁:</strong> 대량의 데이터를 등록할 때는 반드시 템플릿 형식을 준수하세요. 형식이 맞지 않으면 업로드가 실패할 수 있습니다.
                    </p>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-xl font-semibold mb-3">3. 이메일 관리</h3>
                  
                  <h4 className="font-semibold mb-2 mt-4">이메일 템플릿</h4>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground mb-4">
                    <li>재사용 가능한 이메일 템플릿 생성</li>
                    <li>제목, 본문 작성</li>
                    <li>템플릿 수정 및 삭제</li>
                  </ul>

                  <h4 className="font-semibold mb-2 mt-4">이메일 발송 (첨부파일 지원)</h4>
                  <ol className="list-decimal list-inside space-y-2 text-muted-foreground mb-4">
                    <li>템플릿 선택 또는 직접 작성</li>
                    <li>수신자 선택:
                      <ul className="list-disc list-inside ml-6 mt-2">
                        <li>전체 학생</li>
                        <li>특정 학년</li>
                        <li>특정 반</li>
                        <li>개별 학생 (데이터 조회에서)</li>
                      </ul>
                    </li>
                    <li><strong>첨부파일 추가 (선택사항):</strong>
                      <ul className="list-disc list-inside ml-6 mt-2">
                        <li>파일 선택 또는 카메라로 사진 촬영</li>
                        <li><strong>여러 개의 파일 첨부 가능</strong></li>
                        <li>3개 이상 첨부 시 자동으로 ZIP으로 압축</li>
                        <li>ZIP 파일명: 년-월-일-그룹명.zip</li>
                        <li>개별 파일 삭제 또는 전체 삭제 가능</li>
                      </ul>
                    </li>
                    <li>발송 버튼 클릭</li>
                  </ol>
                  <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-800">
                      <strong>📎 첨부파일 팁:</strong> 여러 자료를 보낼 때는 다중 첨부 기능을 활용하세요. 
                      시스템이 자동으로 ZIP 파일로 묶어서 발송하므로 수신자가 편리하게 다운로드할 수 있습니다.
                    </p>
                  </div>

                  <h4 className="font-semibold mb-2 mt-4">발송 내역</h4>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>전송 성공/실패 여부 확인</li>
                    <li>발송 날짜 및 수신자 정보</li>
                    <li>발송한 이메일 내용 확인</li>
                  </ul>
                </div>

                <Separator />

                <div>
                  <h3 className="text-xl font-semibold mb-3">4. 진로상담 관리</h3>
                  <p className="text-muted-foreground mb-4">
                    학생별 진로상담 기록을 관리할 수 있습니다.
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>학생 검색 (학번, 이름)</li>
                    <li>상담 기록 등록 (상담일, 상담 내용, 상담자)</li>
                    <li>첨부파일 업로드 (상담 자료)</li>
                    <li>과거 상담 이력 조회</li>
                  </ul>
                </div>

                <Separator />

                <div>
                  <h3 className="text-xl font-semibold mb-3">5. 통계 및 차트</h3>
                  <p className="text-muted-foreground mb-4">
                    다양한 통계 자료를 시각적으로 확인할 수 있습니다.
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>학년별 상벌점 분포</li>
                    <li>월별 상벌점 추이</li>
                    <li>카테고리별 통계</li>
                    <li>학급별 비교</li>
                    <li>기간별 필터링</li>
                  </ul>
                </div>

                <Separator />

                <div>
                  <h3 className="text-xl font-semibold mb-3">6. 리더보드</h3>
                  <p className="text-muted-foreground mb-4">
                    학생들의 순위를 관리하고 우수 학생을 선정할 수 있습니다.
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>전체/학년별/반별 순위 확인</li>
                    <li>연도별 필터링</li>
                    <li>상위권 학생 확인</li>
                    <li>Excel 다운로드</li>
                  </ul>
                </div>

                <Separator />

                <div>
                  <h3 className="text-xl font-semibold mb-3">7. 비밀번호 재설정</h3>
                  <p className="text-muted-foreground mb-4">
                    학생 또는 교사의 비밀번호를 초기화할 수 있습니다.
                  </p>
                  <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                    <li>사용자 유형 선택 (학생/교사)</li>
                    <li>학번 또는 전화번호 입력</li>
                    <li>새 비밀번호 입력</li>
                    <li><strong>"비밀번호 재설정"</strong> 버튼 클릭</li>
                  </ol>
                  <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      <strong>⚠️ 주의:</strong> 비밀번호 재설정 후 반드시 해당 사용자에게 새 비밀번호를 안전하게 전달하세요.
                    </p>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-xl font-semibold mb-3">8. 파일 저장소</h3>
                  <p className="text-muted-foreground mb-4">
                    시스템에 업로드된 모든 파일(사진, 문서 등)을 관리할 수 있습니다.
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>파일 목록 조회</li>
                    <li>파일 다운로드</li>
                    <li>불필요한 파일 삭제</li>
                    <li>저장소 용량 확인</li>
                  </ul>
                </div>

                <Separator />

                <div>
                  <h3 className="text-xl font-semibold mb-3">관리자 보안 수칙</h3>
                  <div className="space-y-3">
                    <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
                      <h4 className="font-semibold mb-2 text-red-800">🔒 계정 보안</h4>
                      <ul className="text-sm text-red-800 space-y-1">
                        <li>• 비밀번호는 주기적으로 변경하세요.</li>
                        <li>• 관리자 계정 정보를 타인과 절대 공유하지 마세요.</li>
                        <li>• 작업 종료 시 반드시 로그아웃하세요.</li>
                      </ul>
                    </div>
                    <div className="p-4 border border-orange-200 bg-orange-50 rounded-lg">
                      <h4 className="font-semibold mb-2 text-orange-800">📊 데이터 관리</h4>
                      <ul className="text-sm text-orange-800 space-y-1">
                        <li>• 중요 데이터는 정기적으로 백업하세요.</li>
                        <li>• 대량 데이터 삭제 전 반드시 확인하세요.</li>
                        <li>• 학생 정보 수정 시 신중하게 확인하세요.</li>
                      </ul>
                    </div>
                    <div className="p-4 border border-blue-200 bg-blue-50 rounded-lg">
                      <h4 className="font-semibold mb-2 text-blue-800">⚖️ 공정성 유지</h4>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• 데이터 조작이나 임의 수정을 금지합니다.</li>
                        <li>• 모든 변경사항은 기록에 남습니다.</li>
                        <li>• 교육 목적으로만 시스템을 사용하세요.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* FAQ */}
          <TabsContent value="faq">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="w-5 h-5" />
                  자주 묻는 질문 (FAQ)
                </CardTitle>
                <CardDescription>사용자들이 자주 묻는 질문과 답변</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-2">Q1. 비밀번호를 잊어버렸어요. 어떻게 하나요?</h4>
                    <p className="text-sm text-muted-foreground">
                      A. 관리자에게 비밀번호 재설정을 요청하세요. 관리자가 새 비밀번호로 초기화해드립니다. 
                      보안을 위해 재설정 후 즉시 비밀번호를 변경하는 것을 권장합니다.
                    </p>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-2">Q2. 상벌점이 잘못 부여된 것 같아요. 어떻게 수정하나요?</h4>
                    <p className="text-sm text-muted-foreground">
                      A. 부여한 교사 또는 관리자에게 문의하세요. 교사는 자신이 부여한 상벌점을 삭제할 수 있으며, 
                      관리자는 모든 상벌점을 수정할 수 있습니다.
                    </p>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-2">Q3. 상점과 벌점의 차이는 무엇인가요?</h4>
                    <p className="text-sm text-muted-foreground">
                      A. 상점은 긍정적인 행동(봉사활동, 우수 과제 등)에 대한 보상이고, 벌점은 규칙 위반(지각, 과제 미제출 등)에 대한 감점입니다. 
                      총점은 (상점 - 벌점)으로 계산됩니다.
                    </p>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-2">Q4. 월별 추천은 어떻게 받을 수 있나요?</h4>
                    <p className="text-sm text-muted-foreground">
                      A. 월별 추천은 교사가 특별히 우수한 학생에게 부여합니다. 평소 성실하고 모범적인 생활을 하면 
                      추천 대상이 될 수 있습니다. 월별 추천은 학기말 시상에 중요한 기준이 됩니다.
                    </p>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-2">Q5. 리더보드 순위는 어떻게 계산되나요?</h4>
                    <p className="text-sm text-muted-foreground">
                      A. 순위는 (총 상점 - 총 벌점)으로 계산되며, 같은 점수인 경우 상점이 많은 순으로 정렬됩니다. 
                      동점인 경우 이름 순으로 표시됩니다.
                    </p>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-2">Q6. 사진 업로드가 안 돼요.</h4>
                    <p className="text-sm text-muted-foreground">
                      A. 다음을 확인하세요: 1) 파일 형식이 PNG, JPG, JPEG인지 확인 2) 파일 크기가 5MB 이하인지 확인 
                      3) 인터넷 연결 상태 확인. 문제가 계속되면 관리자에게 문의하세요.
                    </p>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-2">Q7. 학번 형식이 어떻게 되나요?</h4>
                    <p className="text-sm text-muted-foreground">
                      A. 학번은 5자리로 구성됩니다: [학년 1자리][반 2자리][번호 2자리]. 
                      예시: 1학년 1반 1번 = 10101, 2학년 5반 15번 = 20515
                    </p>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-2">Q8. 데이터가 실시간으로 업데이트되나요?</h4>
                    <p className="text-sm text-muted-foreground">
                      A. 네, 모든 데이터는 실시간으로 동기화됩니다. 교사가 상벌점을 부여하면 즉시 학생 대시보드에 반영되며, 
                      리더보드도 실시간으로 업데이트됩니다.
                    </p>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-2">Q9. 과거 데이터를 조회할 수 있나요?</h4>
                    <p className="text-sm text-muted-foreground">
                      A. 네, 모든 상벌점 내역은 영구적으로 저장됩니다. 학생과 교사는 과거 기록을 조회할 수 있으며, 
                      관리자는 전체 데이터를 검색하고 Excel로 다운로드할 수 있습니다.
                    </p>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-2">Q10. 모바일에서도 사용할 수 있나요?</h4>
                    <p className="text-sm text-muted-foreground">
                      A. 네, 스쿨포인트.상점은 반응형 디자인으로 PC, 태블릿, 스마트폰 모두에서 사용할 수 있습니다. 
                      모바일 브라우저(Chrome, Safari 등)로 접속하면 됩니다.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 문의 방법 */}
          <TabsContent value="contact">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  문의 방법
                </CardTitle>
                <CardDescription>시스템 관련 문의 및 지원</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold mb-3">기술 지원</h3>
                  <p className="text-muted-foreground mb-4">
                    시스템 사용 중 문제가 발생하거나 궁금한 점이 있으시면 아래 방법으로 문의해주세요.
                  </p>
                </div>

                <Separator />

                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">학생 문의</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="font-semibold mb-1">담임 교사</p>
                        <p className="text-sm text-muted-foreground">
                          로그인 문제, 상벌점 관련 문의는 담임 교사에게 먼저 연락하세요.
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold mb-1">학생부</p>
                        <p className="text-sm text-muted-foreground">
                          시스템 접근 문제나 계정 관련 문의는 학생부로 문의하세요.
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">교사 문의</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="font-semibold mb-1">시스템 관리자</p>
                        <p className="text-sm text-muted-foreground">
                          기능 관련 문의나 권한 문제는 시스템 관리자에게 연락하세요.
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold mb-1">기술 지원팀</p>
                        <p className="text-sm text-muted-foreground">
                          시스템 오류나 버그는 기술 지원팀에 보고하세요.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Separator />

                <div>
                  <h3 className="text-xl font-semibold mb-3">자주 발생하는 문제 해결</h3>
                  <div className="space-y-3">
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold mb-2">🔌 로그인이 안 돼요</h4>
                      <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                        <li>입력 정보(학번/전화번호/이메일)를 다시 확인하세요.</li>
                        <li>비밀번호를 정확히 입력했는지 확인하세요.</li>
                        <li>브라우저 캐시를 삭제하고 다시 시도하세요.</li>
                        <li>다른 브라우저로 시도해보세요.</li>
                      </ul>
                    </div>

                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold mb-2">🐌 화면이 느려요</h4>
                      <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                        <li>인터넷 연결 상태를 확인하세요.</li>
                        <li>브라우저를 최신 버전으로 업데이트하세요.</li>
                        <li>다른 탭이나 프로그램을 닫아보세요.</li>
                        <li>페이지를 새로고침해보세요.</li>
                      </ul>
                    </div>

                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold mb-2">📸 사진 업로드가 안 돼요</h4>
                      <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                        <li>파일 형식이 PNG, JPG, JPEG인지 확인하세요.</li>
                        <li>파일 크기가 5MB 이하인지 확인하세요.</li>
                        <li>파일명에 특수문자가 없는지 확인하세요.</li>
                        <li>다른 사진으로 시도해보세요.</li>
                      </ul>
                    </div>

                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold mb-2">❌ 데이터가 저장이 안 돼요</h4>
                      <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                        <li>필수 입력 항목을 모두 작성했는지 확인하세요.</li>
                        <li>입력 형식(학번, 전화번호 등)이 올바른지 확인하세요.</li>
                        <li>인터넷 연결이 안정적인지 확인하세요.</li>
                        <li>페이지를 새로고침하고 다시 시도하세요.</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-xl font-semibold mb-3">개선 제안</h3>
                  <p className="text-muted-foreground mb-4">
                    시스템 개선을 위한 제안이나 새로운 기능 요청이 있으시면 언제든지 관리자에게 말씀해주세요. 
                    여러분의 의견은 시스템을 더 나은 방향으로 발전시키는 데 큰 도움이 됩니다.
                  </p>
                  <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                    <p className="text-sm">
                      <strong>💬 피드백 환영:</strong> 사용하면서 불편한 점이나 개선이 필요한 부분을 발견하시면 
                      주저하지 말고 알려주세요. 모든 의견은 소중하게 검토됩니다.
                    </p>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-xl font-semibold mb-3">긴급 상황</h3>
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <h4 className="font-semibold mb-2 text-red-800">🚨 긴급 문의</h4>
                    <p className="text-sm text-red-800 mb-2">
                      다음과 같은 긴급 상황에서는 즉시 시스템 관리자에게 연락하세요:
                    </p>
                    <ul className="text-sm text-red-800 space-y-1 ml-4 list-disc">
                      <li>계정 해킹 또는 무단 접근 의심</li>
                      <li>개인정보 유출 우려</li>
                      <li>시스템 전체 오류 발생</li>
                      <li>데이터 손실 또는 삭제 문제</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>스쿨포인트.상점 v1.0</p>
          <p className="mt-1">
            이 매뉴얼은 시스템의 기본 사용법을 안내합니다. 추가 문의사항은 관리자에게 연락하세요.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Manual;
