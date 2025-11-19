import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DemeritForm from "@/components/teacher/DemeritForm";

const Demerit = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-demerit-orange">벌점 부여</CardTitle>
      </CardHeader>
      <CardContent>
        <DemeritForm />
      </CardContent>
    </Card>
  );
};

export default Demerit;
