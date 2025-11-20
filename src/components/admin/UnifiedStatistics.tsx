import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StatisticsChart from "./StatisticsChart";
import GradeStatistics from "./GradeStatistics";
import GradeMonthlyTrend from "./GradeMonthlyTrend";

const UnifiedStatistics = () => {
  return (
    <div className="space-y-4">
      <Tabs defaultValue="grade" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="grade">전교생통계</TabsTrigger>
          <TabsTrigger value="class">학급통계</TabsTrigger>
          <TabsTrigger value="trend">학년추이</TabsTrigger>
        </TabsList>
        
        <TabsContent value="grade" className="mt-4">
          <GradeStatistics />
        </TabsContent>
        
        <TabsContent value="class" className="mt-4">
          <StatisticsChart />
        </TabsContent>
        
        <TabsContent value="trend" className="mt-4">
          <GradeMonthlyTrend />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UnifiedStatistics;
