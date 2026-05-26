import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Users } from "lucide-react";

export default function CustomersPage() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline flex items-center gap-2">
            <Users />
            Customer Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>This is the customer management page. Functionality to be added.</p>
        </CardContent>
      </Card>
    </div>
  );
}
