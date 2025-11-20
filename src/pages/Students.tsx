import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Upload, Search, Trash2, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import Papa from "papaparse";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Student {
  student_id: string;
  usn: string;
  id_num: string;
  name: string;
  branch: string;
  academic_year: string;
  batch_year: string;
  email: string;
  mobile_num: string;
  photo: string;
}

export default function Students() {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBatch, setSelectedBatch] = useState<string>("all");
  const [availableBatches, setAvailableBatches] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [csvBatchYear, setCsvBatchYear] = useState("2022");
  const [newStudent, setNewStudent] = useState({
    usn: "",
    id_num: "",
    name: "",
    branch: "",
    email: "",
    mobile_num: "",
    academic_year: "2024-25",
    batch_year: "2022",
    photo: "",
  });

  useEffect(() => {
    fetchStudents();
  }, [user]);

  useEffect(() => {
    filterStudents();
  }, [searchQuery, selectedBatch, students]);

  const fetchStudents = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .eq("uploaded_by", user.id)
        .order("name");

      if (error) throw error;
      setStudents(data || []);
      setFilteredStudents(data || []);
      
      // Extract unique batch years
      const batches = [...new Set(data?.map(s => s.batch_year).filter(Boolean) || [])].sort().reverse();
      setAvailableBatches(batches);
    } catch (error) {
      console.error("Error fetching students:", error);
      toast.error("Failed to load students");
    } finally {
      setLoading(false);
    }
  };

  const filterStudents = () => {
    let filtered = students;
    
    // Filter by batch
    if (selectedBatch !== "all") {
      filtered = filtered.filter(s => s.batch_year === selectedBatch);
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          s.usn.toLowerCase().includes(query) ||
          s.branch.toLowerCase().includes(query) ||
          s.batch_year?.toLowerCase().includes(query) ||
          s.email.toLowerCase().includes(query)
      );
    }
    
    setFilteredStudents(filtered);
  };

  const parseDateDDMMYYYY = (dateStr: string): string | null => {
    if (!dateStr || dateStr.trim() === '') return null;
    
    const trimmed = dateStr.trim();
    
    // Handle DD-MM-YYYY format (17-10-2004 or 28-05-2003)
    const parts = trimmed.split('-');
    if (parts.length === 3 && parts[0].length <= 2) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2];
      // Return in YYYY-MM-DD format for PostgreSQL
      return `${year}-${month}-${day}`;
    }
    
    // If already in YYYY-MM-DD format, return as-is
    if (parts.length === 3 && parts[0].length === 4) {
      return trimmed;
    }
    
    return null;
  };

  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);

    Papa.parse(file, {
      header: true,
      complete: async (results) => {
        try {
          const studentsData = results.data
            .filter((row: any) => row.USN && row.Name)
            .map((row: any) => ({
              usn: row.USN,
              id_num: row.IDNum || row.USN,
              name: row.Name,
              branch: row.Branch || "",
              dob: parseDateDDMMYYYY(row.DOB),
              gender: row.Gender || null,
              mobile_num: row.MobileNum || "",
              email: row.Email || "",
              photo: row.Photo || "",
              academic_year: row.AcademicYear || "2024-25",
              batch_year: row.BatchYear || csvBatchYear,
              uploaded_by: user.id,
            }));

          const { error } = await supabase.from("students").insert(studentsData);

          if (error) throw error;

          toast.success(`Successfully uploaded ${studentsData.length} students!`);
          fetchStudents();
        } catch (error: any) {
          console.error("Error uploading CSV:", error);
          toast.error("Failed to upload students: " + error.message);
        } finally {
          setUploading(false);
        }
      },
      error: (error) => {
        console.error("CSV parsing error:", error);
        toast.error("Failed to parse CSV file");
        setUploading(false);
      },
    });
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const { error } = await supabase.from("students").insert([{
        ...newStudent,
        uploaded_by: user.id,
      }]);

      if (error) throw error;

      toast.success("Student added successfully!");
      setAddDialogOpen(false);
      setNewStudent({
        usn: "",
        id_num: "",
        name: "",
        branch: "",
        email: "",
        mobile_num: "",
        academic_year: "2024-25",
        batch_year: "2022",
        photo: "",
      });
      fetchStudents();
    } catch (error: any) {
      console.error("Error adding student:", error);
      toast.error("Failed to add student: " + error.message);
    }
  };

  const handleDelete = async (studentId: string) => {
    if (!confirm("Are you sure you want to delete this student?")) return;

    try {
      const { error } = await supabase.from("students").delete().eq("student_id", studentId);

      if (error) throw error;

      toast.success("Student deleted successfully");
      fetchStudents();
    } catch (error) {
      console.error("Error deleting student:", error);
      toast.error("Failed to delete student");
    }
  };

  const handleDeleteBatch = async (batchYear: string) => {
    const studentsInBatch = students.filter(s => s.batch_year === batchYear).length;
    
    if (!confirm(`Are you sure you want to delete all ${studentsInBatch} students from batch ${batchYear}? This action cannot be undone.`)) return;

    try {
      const { error } = await supabase
        .from("students")
        .delete()
        .eq("uploaded_by", user?.id)
        .eq("batch_year", batchYear);

      if (error) throw error;

      toast.success(`Successfully deleted ${studentsInBatch} students from batch ${batchYear}!`);
      setSelectedBatch("all");
      fetchStudents();
    } catch (error: any) {
      console.error("Error deleting batch:", error);
      toast.error("Failed to delete batch: " + error.message);
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
            <h1 className="text-3xl font-bold">Student Management</h1>
            <p className="text-muted-foreground mt-2">Manage your student database</p>
          </div>
          <div className="flex gap-3">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload CSV
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Upload Students from CSV</DialogTitle>
                  <DialogDescription>
                    Upload a CSV file to add multiple students at once
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="batch-year-csv">Batch Year for Upload</Label>
                    <Input
                      id="batch-year-csv"
                      type="text"
                      placeholder="e.g., 2022"
                      value={csvBatchYear}
                      onChange={(e) => setCsvBatchYear(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="csv-upload">Select CSV File</Label>
                    <Input
                      id="csv-upload"
                      type="file"
                      accept=".csv"
                      onChange={handleCSVUpload}
                      disabled={uploading}
                      className="mt-1"
                    />
                  </div>
                  {uploading && <p className="text-sm text-muted-foreground">Uploading...</p>}
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add Student
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add New Student</DialogTitle>
                  <DialogDescription>
                    Add a student manually to your database
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddStudent} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="usn">USN *</Label>
                      <Input
                        id="usn"
                        placeholder="1BM22CS001"
                        value={newStudent.usn}
                        onChange={(e) => setNewStudent({ ...newStudent, usn: e.target.value.toUpperCase() })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="id_num">ID Number</Label>
                      <Input
                        id="id_num"
                        placeholder="Barcode ID"
                        value={newStudent.id_num}
                        onChange={(e) => setNewStudent({ ...newStudent, id_num: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      placeholder="Student Name"
                      value={newStudent.name}
                      onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="branch">Branch</Label>
                      <Input
                        id="branch"
                        placeholder="CSE, ECE, etc."
                        value={newStudent.branch}
                        onChange={(e) => setNewStudent({ ...newStudent, branch: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="batch_year">Batch Year *</Label>
                      <Input
                        id="batch_year"
                        placeholder="2022"
                        value={newStudent.batch_year}
                        onChange={(e) => setNewStudent({ ...newStudent, batch_year: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="academic_year">Academic Year</Label>
                    <Input
                      id="academic_year"
                      placeholder="2024-25"
                      value={newStudent.academic_year}
                      onChange={(e) => setNewStudent({ ...newStudent, academic_year: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="student@bmsit.in"
                      value={newStudent.email}
                      onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mobile">Mobile Number</Label>
                    <Input
                      id="mobile"
                      placeholder="+91 9876543210"
                      value={newStudent.mobile_num}
                      onChange={(e) => setNewStudent({ ...newStudent, mobile_num: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="photo">Photo URL (optional)</Label>
                    <Input
                      id="photo"
                      placeholder="https://..."
                      value={newStudent.photo}
                      onChange={(e) => setNewStudent({ ...newStudent, photo: e.target.value })}
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    Add Student
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name, USN, branch, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedBatch} onValueChange={setSelectedBatch}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by batch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Batches</SelectItem>
                  {availableBatches.map(batch => (
                    <SelectItem key={batch} value={batch}>Batch {batch}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedBatch !== "all" && (
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => handleDeleteBatch(selectedBatch)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Batch {selectedBatch}
                </Button>
              )}
              <div className="text-sm text-muted-foreground">
                {filteredStudents.length} of {students.length} students
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredStudents.length === 0 ? (
              <div className="text-center py-12">
                <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-semibold">No students found</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  {students.length === 0
                    ? "Upload a CSV file to add students"
                    : "Try adjusting your search query"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium text-sm">Photo</th>
                      <th className="text-left py-3 px-4 font-medium text-sm">USN</th>
                      <th className="text-left py-3 px-4 font-medium text-sm">Name</th>
                      <th className="text-left py-3 px-4 font-medium text-sm">Branch</th>
                      <th className="text-left py-3 px-4 font-medium text-sm">Batch</th>
                      <th className="text-left py-3 px-4 font-medium text-sm">Year</th>
                      <th className="text-left py-3 px-4 font-medium text-sm">Contact</th>
                      <th className="text-right py-3 px-4 font-medium text-sm">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student) => (
                      <tr key={student.student_id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4">
                          {student.photo ? (
                            <img
                              src={student.photo}
                              alt={student.name}
                              className="h-10 w-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                              {student.name.charAt(0)}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm font-mono">{student.usn}</td>
                        <td className="py-3 px-4 text-sm font-medium">{student.name}</td>
                        <td className="py-3 px-4 text-sm">{student.branch}</td>
                        <td className="py-3 px-4 text-sm">{student.batch_year || "N/A"}</td>
                        <td className="py-3 px-4 text-sm">{student.academic_year}</td>
                        <td className="py-3 px-4 text-sm">
                          <div>{student.email}</div>
                          <div className="text-muted-foreground">{student.mobile_num}</div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(student.student_id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
