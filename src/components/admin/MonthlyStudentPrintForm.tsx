import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, Upload, X, FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface MonthlyStudentPrintFormProps {
  open: boolean;
  onClose: () => void;
  studentName: string;
  studentGrade: number;
  studentClass: number;
  studentDept?: string;
  initialIntroduction?: string;
  giftBookUrl?: string | null;
}

const MonthlyStudentPrintForm = ({
  open,
  onClose,
  studentName,
  studentGrade,
  studentClass,
  studentDept = "",
  initialIntroduction = "",
  giftBookUrl = null,
}: MonthlyStudentPrintFormProps) => {
  const [selectedMonth, setSelectedMonth] = useState<string>(String(new Date().getMonth() + 1));
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [name, setName] = useState(studentName);
  const [grade, setGrade] = useState(`${studentGrade}학년`);
  const [classNum, setClassNum] = useState(`${studentClass}반`);
  const [dept, setDept] = useState(studentDept);
  const [dreamJob, setDreamJob] = useState("");
  const [introduction, setIntroduction] = useState(initialIntroduction);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // initialIntroduction이 변경되면 introduction 상태 업데이트
  useEffect(() => {
    setIntroduction(initialIntroduction);
  }, [initialIntroduction]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // PDF 다운로드
  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true);
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      
      // PDF용 HTML 생성
      const pdfContent = document.createElement("div");
      pdfContent.innerHTML = getPrintHtml();
      pdfContent.style.width = "210mm";
      document.body.appendChild(pdfContent);
      
      const opt = {
        margin: 0,
        filename: `${selectedMonth}월의학생_${name}.pdf`,
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "mm" as const, format: "a4" as const, orientation: "portrait" as const }
      };
      
      await html2pdf().set(opt).from(pdfContent).save();
      document.body.removeChild(pdfContent);
      toast.success("PDF가 다운로드되었습니다");
    } catch (error: any) {
      toast.error("PDF 다운로드에 실패했습니다");
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // 공통 HTML 생성
  const getPrintHtml = () => `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          @page {
            size: A4;
            margin: 0;
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif;
            width: 210mm;
            min-height: 297mm;
            background: white;
          }
          .page-wrapper {
            width: 100%;
            min-height: 297mm;
            padding: 10mm 15mm 15mm 15mm;
            position: relative;
            background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 50%, #bbf7d0 100%);
          }
          .border-frame {
            width: 100%;
            min-height: calc(297mm - 30mm);
            border: 4px solid #16a34a;
            border-radius: 20px;
            padding: 20mm;
            position: relative;
            background: white;
            box-shadow: 0 10px 40px rgba(22, 163, 74, 0.15);
          }
          .corner-decoration {
            position: absolute;
            width: 60px;
            height: 60px;
            border: 4px solid #22c55e;
          }
          .corner-tl {
            top: 10px;
            left: 10px;
            border-right: none;
            border-bottom: none;
            border-radius: 15px 0 0 0;
          }
          .corner-tr {
            top: 10px;
            right: 10px;
            border-left: none;
            border-bottom: none;
            border-radius: 0 15px 0 0;
          }
          .corner-bl {
            bottom: 10px;
            left: 10px;
            border-right: none;
            border-top: none;
            border-radius: 0 0 0 15px;
          }
          .corner-br {
            bottom: 10px;
            right: 10px;
            border-left: none;
            border-top: none;
            border-radius: 0 0 15px 0;
          }
          .title {
            text-align: center;
            font-size: 38.4pt;
            font-weight: bold;
            margin-bottom: 30px;
            color: #16a34a;
            text-shadow: 2px 2px 4px rgba(22, 163, 74, 0.2);
          }
          .title-decoration {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 20px;
            margin-bottom: 10px;
          }
          .title-line {
            width: 80px;
            height: 4px;
            background: linear-gradient(90deg, transparent, #22c55e, transparent);
          }
          .star {
            color: #fbbf24;
            font-size: 32pt;
          }
          .info-row {
            display: flex;
            gap: 40px;
            margin-bottom: 40px;
            align-items: flex-start;
          }
          .photo-section {
            width: 240px;
            height: 320px;
            border: 4px solid #22c55e;
            border-radius: 15px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(145deg, #f9fafb, #f0fdf4);
            flex-shrink: 0;
            overflow: hidden;
            box-shadow: 0 8px 20px rgba(22, 163, 74, 0.15);
          }
          .photo-section img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
          .details-section {
            flex: 1;
          }
          .detail-item {
            margin-bottom: 25px;
          }
          .detail-label {
            font-size: ${photoPreview ? '12pt' : '24pt'};
            color: #6b7280;
            margin-bottom: ${photoPreview ? '4px' : '8px'};
            display: flex;
            align-items: center;
            gap: ${photoPreview ? '5px' : '10px'};
          }
          .detail-label::before {
            content: "◆";
            color: #22c55e;
            font-size: ${photoPreview ? '8pt' : '16pt'};
          }
          .detail-value {
            font-size: ${photoPreview ? '16pt' : '32pt'};
            font-weight: 600;
            color: #111827;
            padding: ${photoPreview ? '6px 9px' : '12px 18px'};
            border-bottom: ${photoPreview ? '2px' : '4px'} solid #22c55e;
            background: linear-gradient(90deg, #f0fdf4, transparent);
            border-radius: 8px 8px 0 0;
          }
          .introduction-section {
            margin-top: 20px;
          }
          .introduction-label {
            font-size: 20pt;
            font-weight: bold;
            color: #374151;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .introduction-label::before {
            content: "★";
            color: #fbbf24;
            font-size: 18pt;
          }
          .introduction-content {
            font-size: 14pt;
            line-height: 1.6;
            color: #1f2937;
            padding: 20px;
            border: 3px solid #22c55e;
            border-radius: 12px;
            min-height: 120px;
            white-space: pre-wrap;
            background: linear-gradient(145deg, #ffffff, #f0fdf4);
            box-shadow: inset 0 2px 10px rgba(22, 163, 74, 0.1);
          }
          .gift-book-section {
            margin-top: 20px;
          }
          .gift-book-label {
            font-size: 20pt;
            font-weight: bold;
            color: #374151;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .gift-book-label::before {
            content: "📚";
            font-size: 18pt;
          }
          .gift-book-image {
            width: 150px;
            height: auto;
            border: 3px solid #22c55e;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(22, 163, 74, 0.2);
          }
          .footer-decoration {
            text-align: center;
            margin-top: 20px;
            color: #9ca3af;
            font-size: 12pt;
          }
        </style>
      </head>
      <body>
        <div class="page-wrapper">
          <div class="border-frame">
            <div class="corner-decoration corner-tl"></div>
            <div class="corner-decoration corner-tr"></div>
            <div class="corner-decoration corner-bl"></div>
            <div class="corner-decoration corner-br"></div>
            
            <div class="title-decoration">
              <div class="title-line"></div>
              <span class="star">★</span>
              <div class="title-line"></div>
            </div>
            <h1 class="title">${selectedMonth}월의 학생</h1>
            
            <div class="info-row">
              <div class="photo-section">
                ${photoPreview ? `<img src="${photoPreview}" alt="학생 사진" />` : '<span style="color: #9ca3af; font-size: 14pt;">사진 없음</span>'}
              </div>
              <div class="details-section">
                <div class="detail-item">
                  <div class="detail-label">이름</div>
                  <div class="detail-value">${name || "-"}</div>
                </div>
                <div class="detail-item">
                  <div class="detail-label">학년/반/학과</div>
                  <div class="detail-value">${grade} ${classNum}${dept ? ` ${dept}` : ""}</div>
                </div>
                <div class="detail-item">
                  <div class="detail-label">장래희망</div>
                  <div class="detail-value">${dreamJob || "-"}</div>
                </div>
              </div>
            </div>
            <div class="introduction-section">
              <div class="introduction-label">자기소개</div>
              <div class="introduction-content">${introduction || "-"}</div>
            </div>
            ${giftBookUrl ? `
            <div class="gift-book-section">
              <div class="gift-book-label">선물 도서</div>
              <img src="${giftBookUrl}" alt="선물 도서" class="gift-book-image" />
            </div>
            ` : ''}
            <div class="footer-decoration">
              ━━━ ✿ ━━━
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  const handlePrint = () => {
    try {
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        toast.error("팝업이 차단되었습니다. 팝업 차단을 해제해주세요.");
        return;
      }

      printWindow.document.write(getPrintHtml());
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        try {
          printWindow.print();
          printWindow.close();
        } catch (printError) {
          console.error("Print error:", printError);
          toast.error("인쇄 중 오류가 발생했습니다. PDF 다운로드를 시도해주세요.");
          printWindow.close();
        }
      }, 250);
    } catch (error) {
      console.error("Print window error:", error);
      toast.error("인쇄 창을 열 수 없습니다. PDF 다운로드를 시도해주세요.");
    }
  };

  const handleClose = () => {
    setPhotoPreview(null);
    setDreamJob("");
    setIntroduction("");
    setDept("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="w-[95vw] max-w-[800px] max-h-[90vh] flex flex-col p-4 sm:p-6">
        <DialogHeader className="bg-green-500 -mx-4 sm:-mx-6 -mt-4 sm:-mt-6 px-4 sm:px-6 py-3 sm:py-4 rounded-t-lg flex-shrink-0">
          <DialogTitle className="text-white text-base sm:text-lg">이달의학생 출력 양식</DialogTitle>
        </DialogHeader>

        <div 
          className="flex-1 overflow-y-auto space-y-4 sm:space-y-6 pt-3 sm:pt-4 pr-1 sm:pr-2 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full" 
          ref={printRef}
        >

          {/* 제목 - 월 선택 */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-2">
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-16 sm:w-20 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>
                      {i + 1}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-xl sm:text-2xl font-bold text-green-600">월의 학생</span>
            </div>
          </div>

          {/* 정보 영역 */}
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
            {/* 사진 업로드 */}
            <div className="flex-shrink-0 flex flex-col items-center sm:items-start">
              <Label className="text-xs sm:text-sm mb-2 block">학생 증명사진</Label>
              <div
                className="w-[160px] h-[200px] sm:w-[200px] sm:h-[260px] border-2 border-dashed border-muted-foreground/30 rounded-lg flex items-center justify-center cursor-pointer hover:border-green-500 transition-colors overflow-hidden bg-muted/30"
                onClick={() => fileInputRef.current?.click()}
              >
                {photoPreview ? (
                  <img src={photoPreview} alt="학생 사진" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center text-muted-foreground">
                    <Upload className="h-8 w-8 sm:h-10 sm:w-10 mx-auto mb-2" />
                    <span className="text-xs sm:text-sm">사진 업로드</span>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
              />
              {photoPreview && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-[160px] sm:w-[200px] mt-2 text-destructive hover:text-destructive h-8 text-xs sm:text-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPhotoPreview(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                >
                  <X className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                  삭제
                </Button>
              )}
            </div>

            {/* 정보 입력 */}
            <div className="flex-1 space-y-3 sm:space-y-4">
              <div>
                <Label htmlFor="name" className="text-xs sm:text-sm">이름</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="이름 입력"
                  className="h-9 text-sm"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label htmlFor="grade" className="text-xs sm:text-sm">학년</Label>
                  <Input
                    id="grade"
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    placeholder="예: 2학년"
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="classNum" className="text-xs sm:text-sm">반</Label>
                  <Input
                    id="classNum"
                    value={classNum}
                    onChange={(e) => setClassNum(e.target.value)}
                    placeholder="예: 3반"
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="dept" className="text-xs sm:text-sm">학과</Label>
                  <Input
                    id="dept"
                    value={dept}
                    onChange={(e) => setDept(e.target.value)}
                    placeholder="예: 전자과"
                    className="h-9 text-sm"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="dreamJob" className="text-xs sm:text-sm">장래희망</Label>
                <Input
                  id="dreamJob"
                  value={dreamJob}
                  onChange={(e) => setDreamJob(e.target.value)}
                  placeholder="장래희망 입력"
                  className="h-9 text-sm"
                />
              </div>
            </div>
          </div>

          {/* 자기소개 */}
          <div>
            <Label htmlFor="introduction" className="text-xs sm:text-sm">자기소개</Label>
            <Textarea
              id="introduction"
              value={introduction}
              onChange={(e) => setIntroduction(e.target.value)}
              placeholder="자기소개를 입력하세요"
              rows={5}
              className="resize-none text-sm min-h-[100px] sm:min-h-[120px]"
            />
          </div>

          {/* 선물 도서 미리보기 */}
          {giftBookUrl && (
            <div>
              <Label className="text-xs sm:text-sm">선물 도서</Label>
              <div className="mt-2 p-3 border rounded-lg bg-muted/30">
                <img 
                  src={giftBookUrl} 
                  alt="선물 도서" 
                  className="w-24 h-auto rounded border shadow-sm"
                />
              </div>
            </div>
          )}
        </div>

        {/* 버튼 */}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-3 sm:pt-4 border-t flex-shrink-0">
          <Button 
            variant="outline" 
            onClick={handleDownloadPdf}
            disabled={isDownloadingPdf}
            className="sm:mr-auto h-9 text-sm"
          >
            {isDownloadingPdf ? (
              <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 animate-spin" />
            ) : (
              <FileDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
            )}
            PDF
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose} className="flex-1 sm:flex-none h-9 text-sm">
              닫기
            </Button>
            <Button onClick={handlePrint} className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 h-9 text-sm">
              <Printer className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
              출력
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MonthlyStudentPrintForm;
