import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FieldMap } from "@/components/assessor/FieldMap";
import { Search, Filter, Paperclip, AlertCircle, CheckCircle } from "lucide-react";

const LossAssessment = () => {
  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Loss Assessment</h1>
        <p className="text-muted-foreground">Document and evaluate crop loss events</p>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search fields..." className="pl-10" />
        </div>
        <Button variant="outline">
          <Filter className="h-4 w-4 mr-2" />
          Filter
        </Button>
      </div>

      {/* Field Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Field Summary</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-6">
          <div>
            <span className="text-sm text-muted-foreground">Farmer: </span>
            <span className="font-medium">Mugabo John</span>
          </div>
          <div className="h-6 w-px bg-border"></div>
          <div>
            <span className="text-sm text-muted-foreground">Field ID: </span>
            <span className="font-medium">9812345</span>
          </div>
          <div className="h-6 w-px bg-border"></div>
          <div>
            <span className="text-sm text-muted-foreground">Crop: </span>
            <span className="font-medium">Maize</span>
          </div>
          <div className="h-6 w-px bg-border"></div>
          <div>
            <span className="text-sm text-muted-foreground">Area: </span>
            <span className="font-medium">3.4 ha</span>
          </div>
        </CardContent>
      </Card>

      {/* Loss Details */}
      <Card>
        <CardHeader>
          <CardTitle>Loss Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Cause</label>
              <Input defaultValue="Flood" />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Date</label>
              <Input type="date" defaultValue="2025-04-16" />
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium mb-2 block">Description</label>
            <Textarea 
              defaultValue="Continuous rainfall caused waterlogging."
              className="min-h-[100px]"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium mb-2 block">Evidence</label>
            <Button variant="outline" className="w-full justify-start">
              <Paperclip className="h-4 w-4 mr-2" />
              View Attachments (3 files)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Loss Quantification */}
      <Card>
        <CardHeader>
          <CardTitle>Loss Quantification</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="text-sm text-muted-foreground mb-1">Affected Area</p>
              <p className="text-2xl font-bold text-destructive">1.2 ha</p>
              <p className="text-xs text-muted-foreground mt-1">(35%)</p>
            </div>
            <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
              <p className="text-sm text-muted-foreground mb-1">Severity</p>
              <p className="text-2xl font-bold text-warning">Moderate</p>
            </div>
            <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="text-sm text-muted-foreground mb-1">Yield Impact</p>
              <p className="text-2xl font-bold text-destructive">40%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Map Visualization */}
      <Card>
        <CardHeader>
          <CardTitle>Map Visualization</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldMap fieldId="9812345" showLegend={true} overlayType="damage" />
        </CardContent>
      </Card>

      {/* Decision Support */}
      <Card>
        <CardHeader>
          <CardTitle>Decision Support</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-5 w-5 text-warning" />
                <p className="font-medium">Policy Threshold</p>
              </div>
              <p className="text-2xl font-bold">30%</p>
              <p className="text-xs text-muted-foreground mt-1">Minimum affected area</p>
            </div>
            <div className="p-4 rounded-lg bg-success/10 border border-success/20">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-5 w-5 text-success" />
                <p className="font-medium">Meets Condition</p>
              </div>
              <p className="text-2xl font-bold text-success">YES</p>
              <p className="text-xs text-muted-foreground mt-1">Exceeds threshold by 5%</p>
            </div>
          </div>
          
          <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
            <p className="font-medium mb-2">Recommendation</p>
            <p className="text-lg">Proceed to claim validation</p>
          </div>
        </CardContent>
      </Card>

      {/* Assessor Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Assessor Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea 
            placeholder="Add your loss assessment notes here..." 
            className="min-h-[100px]"
            defaultValue="Severe flood confirmed. Drone verified damage zone."
          />
          <div className="flex gap-2">
            <Button>Save Assessment</Button>
            <Button variant="outline">Generate Report PDF</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LossAssessment;
