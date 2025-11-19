import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import MeritForm from "@/components/teacher/MeritForm";

const Merit = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-merit-blue">상점 부여</CardTitle>
      </CardHeader>
      <CardContent>
        <MeritForm />
      </CardContent>
    </Card>
  );
};

export default Merit;
