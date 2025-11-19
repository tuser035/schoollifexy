import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import MonthlyForm from "@/components/teacher/MonthlyForm";

const Monthly = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-monthly-green">이달의 학생 추천</CardTitle>
      </CardHeader>
      <CardContent>
        <MonthlyForm />
      </CardContent>
    </Card>
  );
};

export default Monthly;
