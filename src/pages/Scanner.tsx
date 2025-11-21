import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Download, StopCircle, Trash2, ScanBarcode, UserPlus, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import * as XLSX from 'xlsx';

interface AttendanceRecord {
  record_id: string;
  student_id: string;
  student_usn: string;
  timestamp: string;
  students: {
    usn: string;
    name: string;
    branch: string;
    photo: string | null;
  };
}

interface Student {
  student_id: string;
  usn: string;
  name: string;
  branch: string;
  email: string;
  photo: string | null;
  id_num?: string;
}

export default function Scanner() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("sessionId");
  const navigate = useNavigate();
  
  const [manualInput, setManualInput] = useState("");
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [sessionName, setSessionName] = useState("");
  const [sessionData, setSessionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [scanningIndicator, setScanningIndicator] = useState("");
  const [lastScanned, setLastScanned] = useState<Student | null>(null);
  
  const barcodeBufferRef = useRef("");
  const barcodeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const manualInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!sessionId) {
      toast.error("No session selected");
      navigate("/sessions");
      return;
    }
    
    fetchSessionDetails();
    fetchRecords();
    fetchAllStudents();
    
    const channel = supabase
      .channel('attendance-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'attendance_records',
          filter: `session_id=eq.${sessionId}`
        },
        () => {
          fetchRecords();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const isManualInputFocused = document.activeElement === manualInputRef.current;
      
      if (isManualInputFocused) {
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        
        if (barcodeTimerRef.current) {
          clearTimeout(barcodeTimerRef.current);
          barcodeTimerRef.current = null;
        }

        const scannedCode = barcodeBufferRef.current.trim();
        if (scannedCode) {
          setScanningIndicator("");
          handleScan(scannedCode);
          barcodeBufferRef.current = "";
        }
        return;
      }

      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        
        if (barcodeTimerRef.current) {
          clearTimeout(barcodeTimerRef.current);
        }

        barcodeBufferRef.current += e.key;
        setScanningIndicator(barcodeBufferRef.current);

        barcodeTimerRef.current = setTimeout(() => {
          const scannedCode = barcodeBufferRef.current.trim();
          if (scannedCode.length >= 3) {
            handleScan(scannedCode);
          }
          barcodeBufferRef.current = "";
          setScanningIndicator("");
          barcodeTimerRef.current = null;
        }, 100);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      if (barcodeTimerRef.current) {
        clearTimeout(barcodeTimerRef.current);
      }
    };
  }, [showManualEntry]);

  const fetchRecords = async () => {
    try {
      const { data, error } = await supabase
        .from("attendance_records")
        .select(`
          *,
          students (usn, name, branch, photo)
        `)
        .eq("session_id", sessionId)
        .order("timestamp", { ascending: false });

      if (error) throw error;
      setRecords(data || []);
    } catch (error: any) {
      console.error("Failed to fetch records:", error);
    }
  };

  const fetchAllStudents = async () => {
    try {
      const { data: sessionData } = await supabase
        .from("attendance_sessions")
        .select("batch_year")
        .eq("session_id", sessionId)
        .single();

      if (!sessionData) return;

      const { data, error } = await supabase
        .from("students")
        .select("student_id, usn, name, branch, email, photo, id_num")
        .eq("uploaded_by", user?.id)
        .eq("batch_year", sessionData.batch_year);

      if (error) throw error;
      setAllStudents(data || []);
    } catch (error: any) {
      console.error("Failed to fetch all students:", error);
    }
  };

  const fetchSessionDetails = async () => {
    try {
      const { data, error } = await supabase
        .from("attendance_sessions")
        .select("*")
        .eq("session_id", sessionId)
        .single();

      if (error) throw error;
      setSessionName(data?.session_name || "");
      setSessionData(data);
    } catch (error: any) {
      console.error("Failed to fetch session details:", error);
      toast.error("Failed to load session");
    } finally {
      setLoading(false);
    }
  };

  const getAbsentees = (): Student[] => {
    const presentIds = records.map(r => r.student_id);
    return allStudents.filter(s => !presentIds.includes(s.student_id));
  };

  const handleScan = async (identifier: string) => {
    try {
      const normalizedId = identifier.trim().toUpperCase();
      
      const student = allStudents.find(s => 
        s.usn.toUpperCase() === normalizedId || 
        s.id_num?.toUpperCase() === normalizedId
      );

      if (!student) {
        toast.error(`Student not found: ${identifier}`);
        return;
      }

      const existing = records.find(r => r.student_id === student.student_id);
      if (existing) {
        toast.warning(`${student.name} already scanned`, {
          icon: "⚠️"
        });
        return;
      }

      const { error: insertError } = await supabase
        .from("attendance_records")
        .insert({
          session_id: sessionId,
          student_id: student.student_id,
          student_usn: student.usn,
          scan_method: "barcode",
        });

      if (insertError) throw insertError;

      setLastScanned(student);
      setTimeout(() => setLastScanned(null), 3000);
      
      toast.success(`✓ ${student.name} - ${student.usn}`, {
        duration: 2000,
      });
      
      fetchRecords();
    } catch (error: any) {
      console.error("Scan error:", error);
      toast.error(error.message || "Failed to record attendance");
    }
  };

  const handleManualScan = () => {
    if (manualInput.trim()) {
      handleScan(manualInput.trim());
      setManualInput("");
    }
  };

  const handleDelete = async (recordId: string) => {
    try {
      const { error } = await supabase
        .from("attendance_records")
        .delete()
        .eq("record_id", recordId);

      if (error) throw error;

      toast.info("Record deleted");
      fetchRecords();
    } catch (error: any) {
      toast.error("Failed to delete record");
    }
  };

  const handleExport = () => {
    if (records.length === 0) {
      toast.warning("No records to export");
      return;
    }

    const data = records.map((record, index) => ({
      No: index + 1,
      USN: record.students.usn,
      Name: record.students.name,
      Branch: record.students.branch,
      Timestamp: new Date(record.timestamp).toLocaleString(),
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");
    XLSX.writeFile(workbook, `attendance_${sessionName}_${new Date().toISOString().split('T')[0]}.xlsx`);

    toast.success("Exported to Excel");
  };

  const handleExportAbsentees = () => {
    const absentees = getAbsentees();
    
    if (absentees.length === 0) {
      toast.warning("No absentees to export");
      return;
    }

    const data = absentees.map((student, index) => ({
      No: index + 1,
      USN: student.usn,
      Name: student.name,
      Branch: student.branch,
      Email: student.email,
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Absentees");
    XLSX.writeFile(workbook, `absentees_${sessionName}_${new Date().toISOString().split('T')[0]}.xlsx`);

    toast.success("Absentees exported to Excel");
  };

  const handleEndSession = async () => {
    if (!confirm("Are you sure you want to end this session?")) return;

    try {
      const { error } = await supabase
        .from("attendance_sessions")
        .update({ 
          end_time: new Date().toISOString(),
          status: "ended"
        })
        .eq("session_id", sessionId);

      if (error) throw error;

      toast.success("Session ended");
      navigate("/sessions");
    } catch (error: any) {
      toast.error("Failed to end session");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!sessionData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Session not found</p>
            <Button onClick={() => navigate("/sessions")} className="mt-4">
              Go to Sessions
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={() => navigate("/sessions")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-xl font-bold">{sessionName}</h1>
                <p className="text-sm text-muted-foreground">
                  {sessionData.department} • Batch {sessionData.batch_year}
                </p>
              </div>
              {scanningIndicator && (
                <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-lg animate-pulse">
                  <ScanBarcode className="h-4 w-4 text-primary" />
                  <span className="text-sm font-mono">{scanningIndicator}</span>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowManualEntry(!showManualEntry)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Manual Entry
              </Button>
              <Button variant="outline" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button variant="destructive" onClick={handleEndSession}>
                <StopCircle className="h-4 w-4 mr-2" />
                End Session
              </Button>
            </div>
          </div>
          
          {showManualEntry && (
            <Card className="mt-4">
              <CardContent className="pt-6">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label htmlFor="manual">Enter USN or ID Number</Label>
                    <Input
                      id="manual"
                      ref={manualInputRef}
                      value={manualInput}
                      onChange={(e) => setManualInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleManualScan()}
                      placeholder="Type and press Enter"
                      className="mt-2"
                    />
                  </div>
                  <Button onClick={handleManualScan} className="mt-8">
                    Add
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </header>

      {lastScanned && (
        <div className="container mx-auto px-4 py-4">
          <Card className="border-2 border-success bg-success/5 animate-in fade-in slide-in-from-top-5">
            <CardContent className="py-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20 border-4 border-success">
                  <AvatarImage src={lastScanned.photo || undefined} />
                  <AvatarFallback className="text-lg bg-success/10 text-success">
                    {lastScanned.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                    <span className="text-success font-medium">Just Scanned</span>
                  </div>
                  <h3 className="text-2xl font-bold">{lastScanned.name}</h3>
                  <p className="text-muted-foreground">{lastScanned.usn} • {lastScanned.branch}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <main className="container mx-auto px-4 py-6">
        <Tabs defaultValue="present" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="present">
              <ScanBarcode className="h-4 w-4 mr-2" />
              Present ({records.length})
            </TabsTrigger>
            <TabsTrigger value="absent">
              <Users className="h-4 w-4 mr-2" />
              Absent ({getAbsentees().length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="present">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <ScanBarcode className="h-5 w-5" />
                    Scanned Students
                  </span>
                  <span className="text-lg font-bold text-success">
                    {records.length} / {allStudents.length}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {records.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No students scanned yet. Start scanning to record attendance.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {records.map((record, index) => (
                      <div
                        key={record.record_id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-medium text-muted-foreground w-8">
                            {index + 1}
                          </span>
                          <Avatar>
                            <AvatarImage src={record.students.photo || undefined} />
                            <AvatarFallback>
                              {record.students.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{record.students.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {record.students.usn} • {record.students.branch}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-muted-foreground">
                            {new Date(record.timestamp).toLocaleTimeString()}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(record.record_id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="absent">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Absentees
                  </span>
                  <Button variant="outline" size="sm" onClick={handleExportAbsentees}>
                    <Download className="h-4 w-4 mr-2" />
                    Export List
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {getAbsentees().length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    All students are present! 🎉
                  </p>
                ) : (
                  <div className="space-y-2">
                    {getAbsentees().map((student, index) => (
                      <div
                        key={student.student_id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-medium text-muted-foreground w-8">
                            {index + 1}
                          </span>
                          <Avatar>
                            <AvatarImage src={student.photo || undefined} />
                            <AvatarFallback>
                              {student.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{student.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {student.usn} • {student.branch}
                            </p>
                            {student.email && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {student.email}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
