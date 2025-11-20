import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { BarChart, Calendar, TrendingUp, Users, Award } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SessionStats {
  session_id: string;
  session_name: string;
  session_type: string;
  start_time: string;
  end_time: string | null;
  present_count: number;
  total_students: number;
  attendance_percentage: number;
}

interface BatchStats {
  batch_year: string;
  total_students: number;
  avg_attendance: number;
}

export default function Analytics() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<SessionStats[]>([]);
  const [batchStats, setBatchStats] = useState<BatchStats[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<string>("all");
  const [availableBatches, setAvailableBatches] = useState<string[]>([]);

  useEffect(() => {
    fetchAnalytics();
  }, [user, selectedBatch]);

  const fetchAnalytics = async () => {
    if (!user) return;

    try {
      // Fetch sessions with attendance stats
      const { data: sessionData, error: sessionError } = await supabase
        .from("attendance_sessions")
        .select("*")
        .eq("started_by", user.id)
        .order("start_time", { ascending: false })
        .limit(20);

      if (sessionError) throw sessionError;

      const sessionsWithPercentage = sessionData.map(session => ({
        ...session,
        attendance_percentage: session.total_students > 0 
          ? Math.round((session.present_count / session.total_students) * 100)
          : 0
      }));

      setSessions(sessionsWithPercentage);

      // Fetch batch-wise statistics
      const { data: students, error: studentsError } = await supabase
        .from("students")
        .select("batch_year, student_id")
        .eq("uploaded_by", user.id);

      if (studentsError) throw studentsError;

      // Get unique batches
      const batches = [...new Set(students?.map(s => s.batch_year).filter(Boolean) || [])].sort().reverse();
      setAvailableBatches(batches);

      // Calculate batch-wise stats
      const batchStatsData: BatchStats[] = [];
      
      for (const batch of batches) {
        const batchStudents = students?.filter(s => s.batch_year === batch) || [];
        const studentIds = batchStudents.map(s => s.student_id);

        // Get attendance records for this batch
        const { data: attendanceRecords } = await supabase
          .from("attendance_records")
          .select("student_id, session_id")
          .in("student_id", studentIds);

        const totalAttendance = attendanceRecords?.length || 0;
        const totalPossible = studentIds.length * sessionData.length;
        const avgAttendance = totalPossible > 0 
          ? Math.round((totalAttendance / totalPossible) * 100)
          : 0;

        batchStatsData.push({
          batch_year: batch,
          total_students: batchStudents.length,
          avg_attendance: avgAttendance
        });
      }

      setBatchStats(batchStatsData);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSessions = sessions;

  const overallStats = {
    totalSessions: sessions.length,
    avgAttendance: sessions.length > 0 
      ? Math.round(sessions.reduce((sum, s) => sum + s.attendance_percentage, 0) / sessions.length)
      : 0,
    totalPresent: sessions.reduce((sum, s) => sum + s.present_count, 0),
    totalExpected: sessions.reduce((sum, s) => sum + s.total_students, 0)
  };

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
            <p className="text-muted-foreground mt-2">Comprehensive attendance insights</p>
          </div>
          <Select value={selectedBatch} onValueChange={setSelectedBatch}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by batch" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Batches</SelectItem>
              {availableBatches.map(batch => (
                <SelectItem key={batch} value={batch}>Batch {batch}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Overview Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overallStats.totalSessions}</div>
              <p className="text-xs text-muted-foreground mt-1">All time sessions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Avg Attendance</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overallStats.avgAttendance}%</div>
              <p className="text-xs text-muted-foreground mt-1">Across all sessions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Present</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overallStats.totalPresent}</div>
              <p className="text-xs text-muted-foreground mt-1">Out of {overallStats.totalExpected} expected</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Batches</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{availableBatches.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Active batches</p>
            </CardContent>
          </Card>
        </div>

        {/* Batch-wise Statistics */}
        {batchStats.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart className="h-5 w-5" />
                Batch-wise Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {batchStats.map(batch => (
                  <div key={batch.batch_year} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-lg font-bold text-primary">{batch.batch_year}</span>
                      </div>
                      <div>
                        <div className="font-medium">Batch {batch.batch_year}</div>
                        <div className="text-sm text-muted-foreground">{batch.total_students} students</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{batch.avg_attendance}%</div>
                      <div className="text-sm text-muted-foreground">Avg attendance</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Sessions */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredSessions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No sessions found
              </div>
            ) : (
              <div className="space-y-3">
                {filteredSessions.map(session => (
                  <div key={session.session_id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex-1">
                      <div className="font-medium">{session.session_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {session.session_type} • {new Date(session.start_time).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm font-medium">{session.present_count} / {session.total_students}</div>
                        <div className="text-xs text-muted-foreground">Present</div>
                      </div>
                      <div className={`text-2xl font-bold ${
                        session.attendance_percentage >= 75 ? 'text-green-600' : 
                        session.attendance_percentage >= 50 ? 'text-yellow-600' : 
                        'text-red-600'
                      }`}>
                        {session.attendance_percentage}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
