import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CloudUpload, Edit3, Info } from "lucide-react";
import { FieldUploadInterface } from "@/components/assessor/FieldUploadInterface";
import { FieldDrawInterface } from "@/components/assessor/FieldDrawInterface";

type ProcessingMode = "select" | "upload" | "draw";

const FieldProcessing = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fieldId = searchParams.get("fieldId");
  const farmerName = searchParams.get("farmer") || "Unknown Farmer";
  const farmName = searchParams.get("name") || "New Field";
  
  const [mode, setMode] = useState<ProcessingMode>("select");

  return (
    <div className="min-h-screen bg-background p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)} 
          className="mb-4 hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Fields List
        </Button>
        
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-foreground">
            Process Field: {farmName}
          </h1>
          <p className="text-xl text-muted-foreground">
            Geometry Capture • {farmerName}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto">
        {mode === "select" && (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-semibold text-foreground mb-2">
                Select the field adding option
              </h2>
            </div>

            {/* Selection Cards */}
            <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
              {/* Upload Card */}
              <Card className="border-2 border-primary/30 hover:border-primary hover:bg-card/80 transition-all cursor-pointer group">
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto mb-4 p-6 bg-primary/10 rounded-full w-fit group-hover:bg-primary/20 transition-all">
                    <CloudUpload className="h-16 w-16 text-primary" />
                  </div>
                  <CardTitle className="text-2xl">Upload fields</CardTitle>
                  <CardDescription className="text-base mt-2">
                    Drag-and-drop here or select files with the field contours for the upload to start
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button 
                    className="w-full h-12 text-base font-semibold"
                    variant="outline"
                    onClick={() => setMode("upload")}
                  >
                    SELECT FILES
                  </Button>
                  
                  <div className="text-center space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Supported formats are:
                    </p>
                    <p className="text-sm text-muted-foreground font-mono">
                      .kml, .kmz, .geojson, .shp or zip
                    </p>
                    <p className="text-xs text-muted-foreground">
                      (containing .shp, .shx, .dbf files)
                    </p>
                    <Button 
                      variant="link" 
                      className="text-primary text-sm"
                      onClick={() => window.open('/sample-field.geojson', '_blank')}
                    >
                      Download sample ▼
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Draw Card */}
              <Card className="border-2 border-muted hover:border-primary hover:bg-card/80 transition-all cursor-pointer group">
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto mb-4 p-6 bg-muted rounded-full w-fit group-hover:bg-primary/20 transition-all">
                    <Edit3 className="h-16 w-16 text-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <CardTitle className="text-2xl">Draw field on map</CardTitle>
                  <CardDescription className="text-base mt-2">
                    Draw your field on a map, shaping polygon with a drawing tool
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground"
                    onClick={() => setMode("draw")}
                  >
                    DRAW FIELD
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Info Footer */}
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground pt-4">
              <Info className="h-4 w-4" />
              <p>On the Free plan, you can add no more than 100 fields to your account.</p>
            </div>
          </div>
        )}

        {mode === "upload" && (
          <FieldUploadInterface 
            fieldId={fieldId}
            farmerName={farmerName}
            farmName={farmName}
            onBack={() => setMode("select")}
          />
        )}

        {mode === "draw" && (
          <FieldDrawInterface 
            fieldId={fieldId}
            farmerName={farmerName}
            onBack={() => setMode("select")}
          />
        )}
      </div>
    </div>
  );
};

export default FieldProcessing;
