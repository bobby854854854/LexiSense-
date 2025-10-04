import { UploadZone } from "../upload-zone";

export default function UploadZoneExample() {
  return (
    <div className="p-8 bg-background max-w-2xl">
      <UploadZone
        onFileSelect={(file) => console.log("File selected:", file.name)}
        testId="upload-zone-contract"
      />
    </div>
  );
}
