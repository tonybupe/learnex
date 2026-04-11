// src/pages/shared/UnauthorizedPage.tsx
import { Link } from "react-router-dom";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

export default function UnauthorizedPage() {
  return (
    <div className="unauthorized-page" style={{ 
      display: "flex", 
      minHeight: "100vh", 
      alignItems: "center", 
      justifyContent: "center",
      background: "var(--grad)",
      padding: "20px"
    }}>
      <Card style={{ 
        maxWidth: "400px", 
        padding: "40px", 
        textAlign: "center",
        boxShadow: "var(--shadow-lg)"
      }}>
        <div style={{ fontSize: "64px", marginBottom: "24px" }}>
          🚫
        </div>
        
        <h1 style={{ 
          fontSize: "28px", 
          fontWeight: 800, 
          marginBottom: "12px",
          color: "var(--text)"
        }}>
          Access Denied
        </h1>
        
        <p style={{ 
          color: "var(--muted)", 
          marginBottom: "28px",
          fontSize: "16px",
          lineHeight: 1.6
        }}>
          You don't have permission to access this page. 
          Please contact your administrator if you believe this is an error.
        </p>
        
        <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
          <Link to="/">
            <Button className="btn btn-primary">
              Go to Home
            </Button>
          </Link>
          
          <Link to="/auth/login">
            <Button className="btn btn-ghost">
              Switch Account
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}