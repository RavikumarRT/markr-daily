import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Calendar, Plus, Play, Pause, Square, Trash2, Copy } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface Session {
  session_id: string;
  session_name: string;
  department: string;
  academic_year: string;
  session_type: string;
  start_time: string;
  end_time: string | null;
  status: string;
  present_count: number;
  total_students: number;
}

export default function Sessions() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [availableBatches, setAvailableBatches] = useState<string[]>([]);
  
  const [newSession, setNewSession] = useState({
    session_name: "",
    department: "",
    academic_year: "",
    batch_year: "",
    session_type: "Class",
  });

  useEffect(() => {
    fetchSessions();
    fetchAvailableYears();
    fetchAvailableBatches();
  }, [user]);

  const fetchAvailableYears = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("students")
        .select("academic_year")
        .eq("uploaded_by", user.id);

      if (error) throw error;

      const uniqueYears = [...new Set(data?.map(s => s.academic_year) || [])];
      setAvailableYears(uniqueYears.sort().reverse());
      
      // Set default year if available
      if (uniqueYears.length > 0 && !newSession.academic_year) {
        setNewSession(prev => ({ ...prev, academic_year: uniqueYears[0] }));
      }
    } catch (error) {
      console.error("Error fetching years:", error);
    }
  };

  const fetchAvailableBatches = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("students")
        .select("batch_year")
        .eq("uploaded_by", user.id);

      if (error) throw error;

      const uniqueBatches = [...new Set(data?.map(s => s.batch_year).filter(Boolean) || [])].sort().reverse();
      setAvailableBatches(uniqueBatches);
      
      // Set default batch if available
      if (uniqueBatches.length > 0 && !newSession.batch_year) {
        setNewSession(prev => ({ ...prev, batch_year: uniqueBatches[0] }));
      }
    } catch (error) {
      console.error("Error fetching batches:", error);
    }
  };

  const fetchSessions = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("attendance_sessions")
        .select("*")
        .eq("started_by", user.id)
        .order("start_time", { ascending: false });

      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error("Error fetching sessions:", error);
      toast.error("Failed to load sessions");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      // Count students for this batch and academic year
      const { count: totalStudents } = await supabase
        .from("students")
        .select("*", { count: "exact", head: true })
        .eq("uploaded_by", user.id)
        .eq("academic_year", newSession.academic_year)
        .eq("batch_year", newSession.batch_year);

      const { data, error } = await supabase
        .from("attendance_sessions")
        .insert([{
          session_name: newSession.session_name,
          department: newSession.department,
          academic_year: newSession.academic_year,
          session_type: newSession.session_type as any,
          started_by: user.id,
          status: "active" as any,
          total_students: totalStudents || 0,
        }])
        .select()
        .single();

      if (error) throw error;

      toast.success("Session created successfully!");
      setCreateDialogOpen(false);
      setNewSession({
        session_name: "",
        department: "",
        academic_year: "2024-25",
        batch_year: "",
        session_type: "Class",
      });
      fetchSessions();
      
      // Navigate to scanner with new session and batch
      navigate(`/scanner?sessionId=${data.session_id}&batchYear=${newSession.batch_year}`);
    } catch (error: any) {
      console.error("Error creating session:", error);
      toast.error("Failed to create session: " + error.message);
    }
  };

  const handleUpdateStatus = async (sessionId: string, newStatus: string) => {
    try {
      const updateData: any = { status: newStatus };
      if (newStatus === "ended") {
        updateData.end_time = new Date().toISOString();
      }

      const { error } = await supabase
        .from("attendance_sessions")
        .update(updateData)
        .eq("session_id", sessionId);

      if (error) throw error;

      toast.success(`Session ${newStatus}!`);
      fetchSessions();
    } catch (error) {
      console.error("Error updating session:", error);
      toast.error("Failed to update session");
    }
  };

  const handleDelete = async (sessionId: string) => {
    if (!confirm("Are you sure you want to delete this session? This will also delete all attendance records.")) return;

    try {
      const { error } = await supabase
        .from("attendance_sessions")
        .delete()
        .eq("session_id", sessionId);

      if (error) throw error;

      toast.success("Session deleted successfully");
      fetchSessions();
    } catch (error) {
      console.error("Error deleting session:", error);
      toast.error("Failed to delete session");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-success/10 text-success border-success/20";
      case "paused":
        return "bg-warning/10 text-warning border-warning/20";
      case "ended":
        return "bg-muted text-muted-foreground border-border";
      default:
        return "bg-muted text-muted-foreground";
    }
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
            <h1 className="text-3xl font-bold">Sessions</h1>
            <p className="text-muted-foreground mt-2">Manage your attendance sessions</p>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Session
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Session</DialogTitle>
                <DialogDescription>
                  Create a new attendance session for your students
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateSession} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="session-name">Session Name</Label>
                  <Input
                    id="session-name"
                    placeholder="e.g., Placement Drive - Amazon"
                    value={newSession.session_name}
                    onChange={(e) => setNewSession({ ...newSession, session_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    placeholder="e.g., AIML, CSE, ECE"
                    value={newSession.department}
                    onChange={(e) => setNewSession({ ...newSession, department: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="academic-year">Academic Year</Label>
                  <Select
                    value={newSession.academic_year}
                    onValueChange={(value) => setNewSession({ ...newSession, academic_year: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableYears.length > 0 ? (
                        availableYears.map((year) => (
                          <SelectItem key={year} value={year}>
                            {year}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="2024-25">2024-25 (No students uploaded yet)</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Only students from this year will be included
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="batch-year">Batch Year</Label>
                  <Select
                    value={newSession.batch_year}
                    onValueChange={(value) => setNewSession({ ...newSession, batch_year: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select batch" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableBatches.length > 0 ? (
                        availableBatches.map((batch) => (
                          <SelectItem key={batch} value={batch}>
                            Batch {batch}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="2022">Batch 2022 (No batches available)</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Only students from this batch will be included
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="session-type">Session Type</Label>
                  <Select
                    value={newSession.session_type}
                    onValueChange={(value) => setNewSession({ ...newSession, session_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Placement">Placement</SelectItem>
                      <SelectItem value="Workshop">Workshop</SelectItem>
                      <SelectItem value="Seminar">Seminar</SelectItem>
                      <SelectItem value="Class">Class</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full">
                  Create & Start Session
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {sessions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Calendar className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No sessions yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first attendance session to get started
              </p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Session
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {sessions.map((session) => (
              <Card key={session.session_id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl">{session.session_name}</CardTitle>
                      <div className="flex gap-2 mt-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(session.status)}`}>
                          {session.status}
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary/10 text-secondary border border-secondary/20">
                          {session.session_type}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {session.status === "active" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/scanner?sessionId=${session.session_id}`)}
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateStatus(session.session_id, "paused")}
                          >
                            <Pause className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateStatus(session.session_id, "ended")}
                          >
                            <Square className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {session.status === "paused" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateStatus(session.session_id, "active")}
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(session.session_id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Department</div>
                      <div className="font-medium">{session.department}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Academic Year</div>
                      <div className="font-medium">{session.academic_year}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Attendance</div>
                      <div className="font-medium">
                        {session.present_count} / {session.total_students || "-"}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Started</div>
                      <div className="font-medium">
                        {new Date(session.start_time).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
