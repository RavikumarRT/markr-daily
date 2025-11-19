import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { Users, Calendar, TrendingUp, Award } from "lucide-react";

interface SessionAnalytics {
  session_name: string;
  session_type: string;
  present_count: number;
  total_students: number;
  attendance_rate: number;
  start_time: string;
}

interface BatchAnalytics {
  batch_year: string;
  total_students: number;
  sessions_attended: number;
  avg_attendance_rate: number;
}

interface BranchAnalytics {
  branch: string;
  student_count: number;
}

export default function Analytics() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [sessionAnalytics, setSessionAnalytics] = useState<SessionAnalytics[]>([]);
  const [batchAnalytics, setBatchAnalytics] = useState<BatchAnalytics[]>([]);
  const [branchAnalytics, setBranchAnalytics] = useState<BranchAnalytics[]>([]);
  const [overallStats, setOverallStats] = useState({
    totalStudents: 0,
    totalSessions: 0,
    avgAttendanceRate: 0,
    activeBatches: 0,
  });

  useEffect(() => {
    fetchAnalytics();
  }, [user]);

  const fetchAnalytics = async () => {
    if (!user) return;

    try {
      // Fetch session analytics
      const { data: sessions } = await supabase
        .from("attendance_sessions")
        .select("*")
        .eq("started_by", user.id)
        .order("start_time", { ascending: false })
        .limit(10);

      const sessionData: SessionAnalytics[] =
        sessions?.map((s) => ({
          session_name: s.session_name,
          session_type: s.session_type || "N/A",
          present_count: s.present_count || 0,
          total_students: s.total_students || 0,
          attendance_rate:
            s.total_students > 0
              ? Math.round(((s.present_count || 0) / s.total_students) * 100)
              : 0,
          start_time: s.start_time || "",
        })) || [];

      setSessionAnalytics(sessionData);

      // Fetch all students for batch and branch analytics
      const { data: students } = await supabase
        .from("students")
        .select("batch_year, branch")
        .eq("uploaded_by", user.id);

      // Calculate batch analytics
      const batchMap = new Map<string, number>();
      students?.forEach((s) => {
        if (s.batch_year) {
          batchMap.set(s.batch_year, (batchMap.get(s.batch_year) || 0) + 1);
        }
      });

      const batchData: BatchAnalytics[] = Array.from(batchMap.entries())
        .map(([batch_year, total_students]) => ({
          batch_year,
          total_students,
          sessions_attended: 0,
          avg_attendance_rate: 0,
        }))
        .sort((a, b) => b.batch_year.localeCompare(a.batch_year));

      setBatchAnalytics(batchData);

      // Calculate branch analytics
      const branchMap = new Map<string, number>();
      students?.forEach((s) => {
        if (s.branch) {
          branchMap.set(s.branch, (branchMap.get(s.branch) || 0) + 1);
        }
      });

      const branchData: BranchAnalytics[] = Array.from(branchMap.entries())
        .map(([branch, student_count]) => ({
          branch,
          student_count,
        }))
        .sort((a, b) => b.student_count - a.student_count);

      setBranchAnalytics(branchData);

      // Calculate overall stats
      const { count: totalStudents } = await supabase
        .from("students")
        .select("*", { count: "exact", head: true })
        .eq("uploaded_by", user.id);

      const { count: totalSessions } = await supabase
        .from("attendance_sessions")
        .select("*", { count: "exact", head: true })
        .eq("started_by", user.id);

      const avgAttendance =
        sessionData.length > 0
          ? Math.round(
              sessionData.reduce((sum, s) => sum + s.attendance_rate, 0) /
                sessionData.length
            )
          : 0;

      setOverallStats({
        totalStudents: totalStudents || 0,
        totalSessions: totalSessions || 0,
        avgAttendanceRate: avgAttendance,
        activeBatches: batchMap.size,
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--accent))", "hsl(var(--muted))", "#8B5CF6", "#EC4899"];

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Analytics Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Comprehensive insights into attendance and student data
          </p>
        </div>

        {/* Overall Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Students</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overallStats.totalStudents}</div>
              <p className="text-xs text-muted-foreground">
                Across {overallStats.activeBatches} batches
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
              <Calendar className="h-4 w-4 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overallStats.totalSessions}</div>
              <p className="text-xs text-muted-foreground">All time sessions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Attendance</CardTitle>
              <TrendingUp className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overallStats.avgAttendanceRate}%</div>
              <p className="text-xs text-muted-foreground">Last 10 sessions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Batches</CardTitle>
              <Award className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overallStats.activeBatches}</div>
              <p className="text-xs text-muted-foreground">Currently enrolled</p>
            </CardContent>
          </Card>
        </div>

        {/* Session Attendance Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Session Attendance</CardTitle>
            <p className="text-sm text-muted-foreground">
              Attendance rates for the last 10 sessions
            </p>
          </CardHeader>
          <CardContent>
            {sessionAnalytics.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={sessionAnalytics}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="session_name"
                    stroke="hsl(var(--foreground))"
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={100}
                  />
                  <YAxis stroke="hsl(var(--foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="present_count" fill="hsl(var(--primary))" name="Present" />
                  <Bar dataKey="total_students" fill="hsl(var(--muted))" name="Total" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No session data available
              </p>
            )}
          </CardContent>
        </Card>

        {/* Batch and Branch Analytics */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Students by Batch</CardTitle>
              <p className="text-sm text-muted-foreground">
                Distribution across different batches
              </p>
            </CardHeader>
            <CardContent>
              {batchAnalytics.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={batchAnalytics}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ batch_year, percent }) =>
                        `${batch_year} (${(percent * 100).toFixed(0)}%)`
                      }
                      outerRadius={100}
                      fill="hsl(var(--primary))"
                      dataKey="total_students"
                    >
                      {batchAnalytics.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground py-8">No batch data available</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Students by Branch</CardTitle>
              <p className="text-sm text-muted-foreground">
                Distribution across departments
              </p>
            </CardHeader>
            <CardContent>
              {branchAnalytics.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={branchAnalytics} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" stroke="hsl(var(--foreground))" />
                    <YAxis
                      type="category"
                      dataKey="branch"
                      stroke="hsl(var(--foreground))"
                      width={80}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                      }}
                    />
                    <Bar dataKey="student_count" fill="hsl(var(--secondary))" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No branch data available
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Attendance Rate Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Attendance Rate Trend</CardTitle>
            <p className="text-sm text-muted-foreground">
              Percentage of students present over recent sessions
            </p>
          </CardHeader>
          <CardContent>
            {sessionAnalytics.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={sessionAnalytics}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="session_name"
                    stroke="hsl(var(--foreground))"
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={100}
                  />
                  <YAxis stroke="hsl(var(--foreground))" domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="attendance_rate"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    name="Attendance %"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No attendance trend data available
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
