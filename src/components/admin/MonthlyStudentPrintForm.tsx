import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, Upload, X, ImageIcon, FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface MonthlyStudentPrintFormProps {
  open: boolean;
  onClose: () => void;
  studentName: string;
  studentGrade: number;
  studentClass: number;
  studentDept?: string;
}

const MonthlyStudentPrintForm = ({
  open,
  onClose,
  studentName,
  studentGrade,
  studentClass,
  studentDept = "",
}: MonthlyStudentPrintFormProps) => {
  const [selectedMonth, setSelectedMonth] = useState<string>(String(new Date().getMonth() + 1));
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [name, setName] = useState(studentName);
  const [grade, setGrade] = useState(`${studentGrade}학년`);
  const [classNum, setClassNum] = useState(`${studentClass}반`);
  const [dept, setDept] = useState(studentDept);
  const [dreamJob, setDreamJob] = useState("");
  const [introduction, setIntroduction] = useState("");
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const printRef = useRef<HTMLDivElement>(null);

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

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setLogoPreview(reader.result as string);
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
            padding: 15mm;
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
          .logo-section {
            text-align: center;
            margin-bottom: 20px;
          }
          .logo-section img {
            max-height: 80px;
            max-width: 200px;
            object-fit: contain;
          }
          .title {
            text-align: center;
            font-size: 56pt;
            font-weight: bold;
            margin-bottom: 40px;
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
            font-size: 24pt;
            color: #6b7280;
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .detail-label::before {
            content: "◆";
            color: #22c55e;
            font-size: 16pt;
          }
          .detail-value {
            font-size: 32pt;
            font-weight: 600;
            color: #111827;
            padding: 12px 18px;
            border-bottom: 4px solid #22c55e;
            background: linear-gradient(90deg, #f0fdf4, transparent);
            border-radius: 8px 8px 0 0;
          }
          .introduction-section {
            margin-top: 30px;
          }
          .introduction-label {
            font-size: 28pt;
            font-weight: bold;
            color: #374151;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            gap: 15px;
          }
          .introduction-label::before {
            content: "★";
            color: #fbbf24;
            font-size: 24pt;
          }
          .introduction-content {
            font-size: 28pt;
            line-height: 1.8;
            color: #1f2937;
            padding: 30px;
            border: 4px solid #22c55e;
            border-radius: 15px;
            min-height: 200px;
            white-space: pre-wrap;
            background: linear-gradient(145deg, #ffffff, #f0fdf4);
            box-shadow: inset 0 2px 10px rgba(22, 163, 74, 0.1);
          }
          .footer-decoration {
            text-align: center;
            margin-top: 30px;
            color: #9ca3af;
            font-size: 14pt;
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
            
            ${logoPreview ? `<div class="logo-section"><img src="${logoPreview}" alt="학교 로고" /></div>` : ''}
            
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
            <div class="footer-decoration">
              ━━━ ✿ ━━━
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(getPrintHtml());
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const handleClose = () => {
    setPhotoPreview(null);
    setLogoPreview(null);
    setDreamJob("");
    setIntroduction("");
    setDept("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="bg-green-500 -mx-6 -mt-6 px-6 py-4 rounded-t-lg">
          <DialogTitle className="text-white text-lg">이달의학생 출력 양식</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-4" ref={printRef}>
          {/* 학교 로고 업로드 */}
          <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg border border-dashed border-muted-foreground/30">
            <div className="flex-shrink-0">
              <div
                className="w-[100px] h-[60px] border-2 border-dashed border-muted-foreground/30 rounded-lg flex items-center justify-center cursor-pointer hover:border-green-500 transition-colors overflow-hidden bg-background"
                onClick={() => logoInputRef.current?.click()}
              >
                {logoPreview ? (
                  <img src={logoPreview} alt="학교 로고" className="w-full h-full object-contain p-1" />
                ) : (
                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoUpload}
              />
            </div>
            <div className="flex-1">
              <Label className="text-sm font-medium">학교 로고 (선택)</Label>
              <p className="text-xs text-muted-foreground mt-1">출력물 상단에 표시됩니다</p>
            </div>
            {logoPreview && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => {
                  setLogoPreview(null);
                  if (logoInputRef.current) logoInputRef.current.value = "";
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* 제목 - 월 선택 */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-2">
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-20">
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
              <span className="text-2xl font-bold text-green-600">월의 학생</span>
            </div>
          </div>

          {/* 정보 영역 */}
          <div className="flex gap-6">
            {/* 사진 업로드 */}
            <div className="flex-shrink-0">
              <Label className="text-sm mb-2 block">학생 증명사진</Label>
              <div
                className="w-[240px] h-[320px] border-2 border-dashed border-muted-foreground/30 rounded-lg flex items-center justify-center cursor-pointer hover:border-green-500 transition-colors overflow-hidden bg-muted/30"
                onClick={() => fileInputRef.current?.click()}
              >
                {photoPreview ? (
                  <img src={photoPreview} alt="학생 사진" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center text-muted-foreground">
                    <Upload className="h-10 w-10 mx-auto mb-2" />
                    <span className="text-sm">사진 업로드</span>
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
                  className="w-full mt-2 text-destructive hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPhotoPreview(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                >
                  <X className="h-4 w-4 mr-1" />
                  삭제
                </Button>
              )}
            </div>

            {/* 정보 입력 */}
            <div className="flex-1 space-y-4">
              <div>
                <Label htmlFor="name">이름</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="이름 입력"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label htmlFor="grade">학년</Label>
                  <Input
                    id="grade"
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    placeholder="예: 2학년"
                  />
                </div>
                <div>
                  <Label htmlFor="classNum">반</Label>
                  <Input
                    id="classNum"
                    value={classNum}
                    onChange={(e) => setClassNum(e.target.value)}
                    placeholder="예: 3반"
                  />
                </div>
                <div>
                  <Label htmlFor="dept">학과</Label>
                  <Input
                    id="dept"
                    value={dept}
                    onChange={(e) => setDept(e.target.value)}
                    placeholder="예: 전자과"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="dreamJob">장래희망</Label>
                <Input
                  id="dreamJob"
                  value={dreamJob}
                  onChange={(e) => setDreamJob(e.target.value)}
                  placeholder="장래희망 입력"
                />
              </div>
            </div>
          </div>

          {/* 자기소개 */}
          <div>
            <Label htmlFor="introduction">자기소개</Label>
            <Textarea
              id="introduction"
              value={introduction}
              onChange={(e) => setIntroduction(e.target.value)}
              placeholder="자기소개를 입력하세요"
              rows={6}
              className="resize-none"
            />
          </div>
        </div>

        {/* 버튼 */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={handleDownloadPdf}
            disabled={isDownloadingPdf}
            className="mr-auto"
          >
            {isDownloadingPdf ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileDown className="h-4 w-4 mr-2" />
            )}
            PDF
          </Button>
          <Button variant="outline" onClick={handleClose}>
            닫기
          </Button>
          <Button onClick={handlePrint} className="bg-green-600 hover:bg-green-700">
            <Printer className="h-4 w-4 mr-2" />
            출력
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MonthlyStudentPrintForm;
