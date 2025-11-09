import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ScanBarcode, Users, BarChart3, Shield } from "lucide-react";
import bmsitLogo from "@/assets/bmsit-logo.png";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={bmsitLogo} alt="BMSIT" className="h-12 w-auto" />
          </div>
          <Button onClick={() => navigate("/auth")} size="lg">
            Get Started
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-block px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium mb-4">
            Advanced Attendance Management
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
            <span className="gradient-primary bg-clip-text text-transparent">
              Smart Attendance
            </span>
            <br />
            for BMSIT
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Streamline your attendance tracking with barcode scanning, real-time updates, and
            comprehensive analytics. Built for educational excellence.
          </p>
          <div className="flex gap-4 justify-center pt-4">
            <Button onClick={() => navigate("/auth")} size="lg" className="gradient-primary text-white">
              <ScanBarcode className="mr-2 h-5 w-5" />
              Start Scanning
            </Button>
            <Button onClick={() => navigate("/auth")} size="lg" variant="outline">
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="bg-card p-8 rounded-xl shadow-lg border-2 hover:border-primary/50 transition-all">
            <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-2">Student Management</h3>
            <p className="text-muted-foreground">
              Easy CSV uploads, bulk operations, and comprehensive student profiles with photos.
            </p>
          </div>

          <div className="bg-card p-8 rounded-xl shadow-lg border-2 hover:border-primary/50 transition-all">
            <div className="bg-secondary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <ScanBarcode className="h-6 w-6 text-secondary" />
            </div>
            <h3 className="text-xl font-bold mb-2">Real-time Scanning</h3>
            <p className="text-muted-foreground">
              Barcode scanner support with instant validation and live attendance updates.
            </p>
          </div>

          <div className="bg-card p-8 rounded-xl shadow-lg border-2 hover:border-primary/50 transition-all">
            <div className="bg-accent/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <BarChart3 className="h-6 w-6 text-accent" />
            </div>
            <h3 className="text-xl font-bold mb-2">Analytics Dashboard</h3>
            <p className="text-muted-foreground">
              Visualize trends, compare departments, and generate comprehensive reports.
            </p>
          </div>
        </div>
      </section>

      {/* Security Banner */}
      <section className="bg-primary/5 border-y">
        <div className="container mx-auto px-4 py-12">
          <div className="flex items-center justify-center gap-4 text-center">
            <Shield className="h-8 w-8 text-primary" />
            <div>
              <h3 className="text-xl font-bold">Secure & Multi-tenant</h3>
              <p className="text-muted-foreground">
                Your data is isolated and protected with row-level security
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-background/80 backdrop-blur-sm mt-20">
        <div className="container mx-auto px-4 py-8 text-center text-muted-foreground">
          <p>© 2025 BMS Institute of Technology & Management. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
