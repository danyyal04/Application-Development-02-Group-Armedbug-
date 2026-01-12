import { LogOut, Clock } from 'lucide-react';
import { Button } from '../ui/button.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card.js';

interface PendingApprovalProps {
  onLogout: () => void;
}

export default function PendingApproval({ onLogout }: PendingApprovalProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-slate-100">
      <Card className="w-full max-w-md text-center shadow-lg">
        <CardHeader>
          <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
            <Clock className="w-8 h-8 text-orange-600" />
          </div>
          <CardTitle className="text-2xl text-slate-900">Account Pending Approval</CardTitle>
          <CardDescription className="text-slate-600 mt-2">
            Your registration is currently under review by the administrator.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600">
            Thank you for registering as a cafeteria owner. An administrator will review your application shortly. 
            Once approved, you'll have full access to the dashboard.
          </p>
          <div className="pt-2">
            <Button variant="outline" onClick={onLogout} className="w-full">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
