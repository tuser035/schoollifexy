import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, Upload, X } from "lucide-react";

interface MonthlyStudentPrintFormProps {
  open: boolean;
  onClose: () => void;
  studentName: string;
  studentGrade: number;
  studentClass: number;
}

const MonthlyStudentPrintForm = ({
  open,
  onClose,
  studentName,
  studentGrade,
  studentClass,
}: MonthlyStudentPrintFormProps) => {
  const [selectedMonth, setSelectedMonth] = useState<string>(String(new Date().getMonth() + 1));
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [name, setName] = useState(studentName);
  const [gradeClass, setGradeClass] = useState(`${studentGrade}학년 ${studentClass}반`);
  const [dreamJob, setDreamJob] = useState("");
  const [introduction, setIntroduction] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${selectedMonth}월의 학생</title>
          <style>
            @page {
              size: A4;
              margin: 20mm;
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
              padding: 20mm;
              background: white;
            }
            .container {
              width: 100%;
              height: 100%;
            }
            .title {
              text-align: center;
              font-size: 28pt;
              font-weight: bold;
              margin-bottom: 30px;
              color: #16a34a;
            }
            .info-row {
              display: flex;
              gap: 30px;
              margin-bottom: 30px;
              align-items: flex-start;
            }
            .photo-section {
              width: 120px;
              height: 160px;
              border: 2px solid #e5e7eb;
              display: flex;
              align-items: center;
              justify-content: center;
              background: #f9fafb;
              flex-shrink: 0;
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
              margin-bottom: 15px;
            }
            .detail-label {
              font-size: 12pt;
              color: #6b7280;
              margin-bottom: 5px;
            }
            .detail-value {
              font-size: 16pt;
              font-weight: 600;
              color: #111827;
              padding: 8px 12px;
              border-bottom: 2px solid #16a34a;
            }
            .introduction-section {
              margin-top: 20px;
            }
            .introduction-label {
              font-size: 14pt;
              font-weight: bold;
              color: #374151;
              margin-bottom: 10px;
            }
            .introduction-content {
              font-size: 14pt;
              line-height: 1.8;
              color: #1f2937;
              padding: 20px;
              border: 2px solid #16a34a;
              border-radius: 8px;
              min-height: 150px;
              white-space: pre-wrap;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 class="title">${selectedMonth}월의 학생</h1>
            <div class="info-row">
              <div class="photo-section">
                ${photoPreview ? `<img src="${photoPreview}" alt="학생 사진" />` : '<span style="color: #9ca3af; font-size: 10pt;">사진 없음</span>'}
              </div>
              <div class="details-section">
                <div class="detail-item">
                  <div class="detail-label">이름</div>
                  <div class="detail-value">${name || "-"}</div>
                </div>
                <div class="detail-item">
                  <div class="detail-label">학년/반</div>
                  <div class="detail-value">${gradeClass || "-"}</div>
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
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const handleClose = () => {
    setPhotoPreview(null);
    setDreamJob("");
    setIntroduction("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="bg-green-500 -mx-6 -mt-6 px-6 py-4 rounded-t-lg">
          <DialogTitle className="text-white text-lg">이달의학생 출력 양식</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-4" ref={printRef}>
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
                className="w-[120px] h-[160px] border-2 border-dashed border-muted-foreground/30 rounded-lg flex items-center justify-center cursor-pointer hover:border-green-500 transition-colors overflow-hidden bg-muted/30"
                onClick={() => fileInputRef.current?.click()}
              >
                {photoPreview ? (
                  <img src={photoPreview} alt="학생 사진" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center text-muted-foreground">
                    <Upload className="h-8 w-8 mx-auto mb-2" />
                    <span className="text-xs">사진 업로드</span>
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
              <div>
                <Label htmlFor="gradeClass">학년/반</Label>
                <Input
                  id="gradeClass"
                  value={gradeClass}
                  onChange={(e) => setGradeClass(e.target.value)}
                  placeholder="예: 2학년 3반"
                />
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
