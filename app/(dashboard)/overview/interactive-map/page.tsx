import { InteractiveMapView } from "@/components/dashboard/interactive-map-view";
import { DataLayersProvider } from "@/hooks/data-layers-context";

export default function DataOverviewInteractiveMapPage() {
  return (
    <div className="-m-6 h-[calc(100vh-6.5rem)] w-[calc(100%+3rem)] overflow-hidden">
      <DataLayersProvider>
        <InteractiveMapView />
      </DataLayersProvider>
    </div>
  );
}
