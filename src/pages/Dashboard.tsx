import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Users, Calendar, TrendingUp, ScanBarcode } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface Stats {
  totalStudents: number;
  activeSessions: number;
  totalSessions: number;
  recentAttendance: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalStudents: 0,
    activeSessions: 0,
    totalSessions: 0,
    recentAttendance: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [user]);

  const fetchStats = async () => {
    if (!user) return;

    try {
      // Get total students
      const { count: studentsCount } = await supabase
        .from("students")
        .select("*", { count: "exact", head: true })
        .eq("uploaded_by", user.id);

      // Get active sessions
      const { count: activeCount } = await supabase
        .from("attendance_sessions")
        .select("*", { count: "exact", head: true })
        .eq("started_by", user.id)
        .eq("status", "active");

      // Get total sessions
      const { count: totalCount } = await supabase
        .from("attendance_sessions")
        .select("*", { count: "exact", head: true })
        .eq("started_by", user.id);

      // Get recent attendance (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: recentSessions } = await supabase
        .from("attendance_sessions")
        .select("present_count")
        .eq("started_by", user.id)
        .gte("start_time", sevenDaysAgo.toISOString());

      const recentAttendance = recentSessions?.reduce((sum, s) => sum + (s.present_count || 0), 0) || 0;

      setStats({
        totalStudents: studentsCount || 0,
        activeSessions: activeCount || 0,
        totalSessions: totalCount || 0,
        recentAttendance,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: "Total Students",
      value: stats.totalStudents,
      icon: Users,
      description: "Registered in system",
      color: "text-primary",
      link: "/students",
    },
    {
      title: "Active Sessions",
      value: stats.activeSessions,
      icon: Calendar,
      description: "Currently running",
      color: "text-success",
      link: "/sessions",
    },
    {
      title: "Total Sessions",
      value: stats.totalSessions,
      icon: TrendingUp,
      description: "All time",
      color: "text-secondary",
      link: "/sessions",
    },
    {
      title: "Recent Attendance",
      value: stats.recentAttendance,
      icon: ScanBarcode,
      description: "Last 7 days",
      color: "text-accent",
      link: "/analytics",
    },
  ];

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
      <div className="space-y-8 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Welcome back! Here's an overview of your attendance system.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Link key={stat.title} to={stat.link}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-primary/50">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </CardTitle>
                    <Icon className={`h-5 w-5 ${stat.color}`} />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{stat.value}</div>
                    <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link to="/students">
                <Button className="w-full justify-start" variant="outline">
                  <Users className="mr-2 h-4 w-4" />
                  Manage Students
                </Button>
              </Link>
              <Link to="/sessions">
                <Button className="w-full justify-start" variant="outline">
                  <Calendar className="mr-2 h-4 w-4" />
                  View Sessions
                </Button>
              </Link>
              <Link to="/scanner">
                <Button className="w-full justify-start gradient-primary text-white hover:opacity-90">
                  <ScanBarcode className="mr-2 h-4 w-4" />
                  Start Scanner
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Getting Started</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  1
                </div>
                <div>
                  <p className="font-medium text-foreground">Upload Student Data</p>
                  <p className="text-xs">Add students via CSV or manually</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  2
                </div>
                <div>
                  <p className="font-medium text-foreground">Create Session</p>
                  <p className="text-xs">Set up an attendance session</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  3
                </div>
                <div>
                  <p className="font-medium text-foreground">Scan Attendance</p>
                  <p className="text-xs">Use barcode or manual entry</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
