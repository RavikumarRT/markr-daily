import { useEffect, useState, useRef } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSearchParams } from "react-router-dom";
import { ScanBarcode, CheckCircle2, XCircle, Users } from "lucide-react";
import { toast } from "sonner";

interface AttendanceRecord {
  student_usn: string;
  student_name: string;
  timestamp: string;
  student_photo?: string;
}

export default function Scanner() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("sessionId");
  
  const [session, setSession] = useState<any>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [scanInput, setScanInput] = useState("");
  const [lastScanned, setLastScanned] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!sessionId) {
      toast.error("No session selected");
      return;
    }
    
    fetchSessionData();
    const interval = setInterval(fetchAttendanceRecords, 2000); // Real-time sync every 2s
    
    return () => clearInterval(interval);
  }, [sessionId, user]);

  useEffect(() => {
    // Auto-focus input for barcode scanner
    inputRef.current?.focus();
  }, []);

  const fetchSessionData = async () => {
    if (!sessionId || !user) return;

    try {
      const { data, error } = await supabase
        .from("attendance_sessions")
        .select("*")
        .eq("session_id", sessionId)
        .eq("started_by", user.id)
        .single();

      if (error) throw error;
      setSession(data);
      fetchAttendanceRecords();
    } catch (error) {
      console.error("Error fetching session:", error);
      toast.error("Failed to load session");
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceRecords = async () => {
    if (!sessionId) return;

    try {
      const { data: recordsData, error } = await supabase
        .from("attendance_records")
        .select(`
          student_usn,
          timestamp,
          students (name, photo)
        `)
        .eq("session_id", sessionId)
        .order("timestamp", { ascending: false });

      if (error) throw error;

      const formattedRecords = recordsData?.map((r: any) => ({
        student_usn: r.student_usn,
        student_name: r.students?.name || "Unknown",
        timestamp: r.timestamp,
        student_photo: r.students?.photo,
      })) || [];

      setRecords(formattedRecords);
    } catch (error) {
      console.error("Error fetching records:", error);
    }
  };

  const handleScan = async (identifier: string) => {
    if (!identifier.trim() || !sessionId || !user) return;

    try {
      // Find student by USN or ID number
      const { data: student, error: studentError } = await supabase
        .from("students")
        .select("*")
        .eq("uploaded_by", user.id)
        .or(`usn.eq.${identifier},id_num.eq.${identifier}`)
        .maybeSingle();

      if (studentError) throw studentError;

      if (!student) {
        toast.error("Student not found!");
        setScanInput("");
        return;
      }

      // Check if already marked present
      const { data: existing } = await supabase
        .from("attendance_records")
        .select("*")
        .eq("session_id", sessionId)
        .eq("student_usn", student.usn)
        .maybeSingle();

      if (existing) {
        toast.error(`${student.name} already marked present!`, {
          icon: <XCircle className="h-4 w-4" />,
        });
        setScanInput("");
        return;
      }

      // Mark attendance
      const { error: insertError } = await supabase
        .from("attendance_records")
        .insert({
          session_id: sessionId,
          student_usn: student.usn,
          student_id: student.student_id,
          scan_method: "manual",
        });

      if (insertError) throw insertError;

      setLastScanned(student);
      toast.success(`✓ ${student.name} marked present!`, {
        icon: <CheckCircle2 className="h-4 w-4 text-success" />,
      });
      
      setScanInput("");
      fetchAttendanceRecords();
      
      // Clear last scanned after 3 seconds
      setTimeout(() => setLastScanned(null), 3000);
    } catch (error: any) {
      console.error("Error marking attendance:", error);
      toast.error("Failed to mark attendance: " + error.message);
      setScanInput("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleScan(scanInput);
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

  if (!session) {
    return (
      <DashboardLayout>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <XCircle className="h-16 w-16 text-destructive mb-4" />
            <h3 className="text-lg font-semibold mb-2">Session not found</h3>
            <p className="text-sm text-muted-foreground">
              The requested session does not exist or you don't have access to it.
            </p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold">Scanner</h1>
          <p className="text-muted-foreground mt-2">{session.session_name}</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Scanner Input */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-2 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ScanBarcode className="h-5 w-5 text-primary" />
                  Scan or Enter Manually
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    ref={inputRef}
                    placeholder="Enter USN or ID Number..."
                    value={scanInput}
                    onChange={(e) => setScanInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="text-lg h-14"
                  />
                  <Button 
                    onClick={() => handleScan(scanInput)}
                    size="lg"
                    className="px-8"
                  >
                    Mark
                  </Button>
                </div>
                
                <div className="text-sm text-muted-foreground">
                  <p>• Use barcode scanner or type manually</p>
                  <p>• Press Enter or click Mark to record attendance</p>
                </div>
              </CardContent>
            </Card>

            {/* Last Scanned */}
            {lastScanned && (
              <Card className="border-2 border-success animate-scan-success">
                <CardContent className="py-6">
                  <div className="flex items-center gap-4">
                    {lastScanned.photo ? (
                      <img
                        src={lastScanned.photo}
                        alt={lastScanned.name}
                        className="h-20 w-20 rounded-full object-cover border-4 border-success"
                      />
                    ) : (
                      <div className="h-20 w-20 rounded-full bg-success/10 flex items-center justify-center text-success text-2xl font-bold border-4 border-success">
                        {lastScanned.name.charAt(0)}
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle2 className="h-5 w-5 text-success" />
                        <span className="text-success font-medium">Marked Present</span>
                      </div>
                      <h3 className="text-xl font-bold">{lastScanned.name}</h3>
                      <p className="text-sm text-muted-foreground">{lastScanned.usn}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Attendance List */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Scans</CardTitle>
              </CardHeader>
              <CardContent>
                {records.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No attendance records yet. Start scanning!
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {records.map((record, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50"
                      >
                        {record.student_photo ? (
                          <img
                            src={record.student_photo}
                            alt={record.student_name}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                            {record.student_name.charAt(0)}
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="font-medium">{record.student_name}</div>
                          <div className="text-xs text-muted-foreground">{record.student_usn}</div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(record.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Stats Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Session Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Present Count</div>
                  <div className="text-3xl font-bold text-success">{records.length}</div>
                </div>
                
                <div className="pt-4 border-t">
                  <div className="text-sm text-muted-foreground mb-1">Department</div>
                  <div className="font-medium">{session.department}</div>
                </div>
                
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Academic Year</div>
                  <div className="font-medium">{session.academic_year}</div>
                </div>
                
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Session Type</div>
                  <div className="font-medium">{session.session_type}</div>
                </div>
                
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Started At</div>
                  <div className="font-medium text-sm">
                    {new Date(session.start_time).toLocaleString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
