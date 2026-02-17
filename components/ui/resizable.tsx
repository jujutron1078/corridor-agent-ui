"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type Orientation = "horizontal" | "vertical";

type ResizablePanelGroupProps = {
  orientation: Orientation;
  className?: string;
  children: React.ReactNode;
  onLayout?: (sizes: number[]) => void;
};

type ResizablePanelProps = {
  defaultSize?: string | number;
  minSize?: number;
  className?: string;
  children: React.ReactNode;
};

type ResizableHandleProps = {
  withHandle?: boolean;
  className?: string;
};

type InjectedPanelProps = {
  size?: number;
  orientation?: Orientation;
};

type InjectedHandleProps = {
  orientation?: Orientation;
  onResizeStart?: (event: React.PointerEvent<HTMLDivElement>) => void;
};

function parseSize(value: string | number | undefined, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value.replace("%", ""));
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

function normalizeSizes(sizes: number[]): number[] {
  const total = sizes.reduce((sum, size) => sum + size, 0);
  if (total <= 0) {
    return sizes.map(() => 100 / sizes.length);
  }
  return sizes.map((size) => (size / total) * 100);
}

export function ResizablePanelGroup({
  orientation,
  className,
  children,
  onLayout,
}: ResizablePanelGroupProps) {
  const childrenArray = React.Children.toArray(children);

  const panelElements = childrenArray.filter(
    (child): child is React.ReactElement<ResizablePanelProps> =>
      React.isValidElement(child) && child.type === ResizablePanel
  );

  const panelDefaults = panelElements.map((panel) =>
    parseSize(panel.props.defaultSize, 100 / Math.max(panelElements.length, 1))
  );
  const panelMinimums = panelElements.map((panel) =>
    parseSize(panel.props.minSize, 10)
  );
  const panelConfigKey = `${orientation}:${panelDefaults.join(",")}`;

  const [sizes, setSizes] = React.useState<number[]>(() =>
    normalizeSizes(panelDefaults.length > 0 ? panelDefaults : [100])
  );
  const lastPanelConfigKeyRef = React.useRef(panelConfigKey);

  React.useEffect(() => {
    if (lastPanelConfigKeyRef.current === panelConfigKey) return;
    lastPanelConfigKeyRef.current = panelConfigKey;

    const nextSizes = normalizeSizes(panelDefaults.length > 0 ? panelDefaults : [100]);
    setSizes((previous) => {
      if (
        previous.length === nextSizes.length &&
        previous.every((value, index) => Math.abs(value - nextSizes[index]) < 0.001)
      ) {
        return previous;
      }
      return nextSizes;
    });
  }, [panelConfigKey, panelDefaults]);

  const startResize = React.useCallback(
    (panelIndex: number, event: React.PointerEvent<HTMLDivElement>) => {
      const container = event.currentTarget.parentElement;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const containerSize = orientation === "horizontal" ? rect.width : rect.height;
      if (containerSize <= 0) return;

      const startPosition = orientation === "horizontal" ? event.clientX : event.clientY;
      const startPrev = sizes[panelIndex];
      const startNext = sizes[panelIndex + 1];
      if (startPrev === undefined || startNext === undefined) return;
      const total = startPrev + startNext;
      const configuredMinPrev = panelMinimums[panelIndex] ?? 10;
      const configuredMinNext = panelMinimums[panelIndex + 1] ?? 10;
      const totalMinimum = configuredMinPrev + configuredMinNext;
      const minPrev =
        totalMinimum > total ? (total * configuredMinPrev) / totalMinimum : configuredMinPrev;
      const minNext =
        totalMinimum > total ? (total * configuredMinNext) / totalMinimum : configuredMinNext;

      const handleMove = (moveEvent: PointerEvent) => {
        const currentPosition = orientation === "horizontal" ? moveEvent.clientX : moveEvent.clientY;
        const deltaPx = currentPosition - startPosition;
        const deltaPercent = (deltaPx / containerSize) * 100;

        const nextPrev = Math.min(Math.max(startPrev + deltaPercent, minPrev), total - minNext);
        const nextNext = total - nextPrev;
        const updated = [...sizes];
        updated[panelIndex] = nextPrev;
        updated[panelIndex + 1] = nextNext;
        setSizes(updated);
        onLayout?.(updated);
      };

      const handleUp = () => {
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
      };

      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
    },
    [onLayout, orientation, panelMinimums, sizes]
  );

  return (
    <div
      className={cn(
        "flex h-full w-full overflow-hidden",
        orientation === "horizontal" ? "flex-row" : "flex-col",
        className
      )}
    >
      {childrenArray.map((child, index) => {
        if (!React.isValidElement(child)) return child;

        const panelIndex = childrenArray
          .slice(0, index)
          .filter(
            (item) => React.isValidElement(item) && item.type === ResizablePanel
          ).length;

        if (child.type === ResizablePanel) {
          const size = sizes[panelIndex] ?? 100 / Math.max(panelElements.length, 1);
          return React.cloneElement(child as React.ReactElement<ResizablePanelProps & InjectedPanelProps>, {
            key: child.key ?? `panel-${index}`,
            size,
            orientation,
          });
        }

        if (child.type === ResizableHandle) {
          const leftPanelIndex = Math.max(0, panelIndex - 1);
          return React.cloneElement(
            child as React.ReactElement<ResizableHandleProps & InjectedHandleProps>,
            {
              key: child.key ?? `handle-${index}`,
              orientation,
              onResizeStart: (event) => startResize(leftPanelIndex, event),
            }
          );
        }

        return child;
      })}
    </div>
  );
}

export function ResizablePanel({
  className,
  children,
  size,
  orientation,
}: ResizablePanelProps & InjectedPanelProps) {
  return (
    <div
      className={cn("min-h-0 min-w-0", className)}
      style={{
        flexBasis: `${size ?? 50}%`,
        flexGrow: 0,
        flexShrink: 0,
        width: orientation === "horizontal" ? undefined : "100%",
        height: orientation === "vertical" ? undefined : "100%",
      }}
    >
      {children}
    </div>
  );
}

export function ResizableHandle({
  withHandle,
  className,
  orientation,
  onResizeStart,
}: ResizableHandleProps & InjectedHandleProps) {
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      onPointerDown={onResizeStart}
      className={cn(
        "relative z-[1200] shrink-0 bg-border",
        orientation === "horizontal" ? "h-full w-px cursor-col-resize" : "h-px w-full cursor-row-resize",
        className
      )}
    >
      {withHandle && (
        <div
          className={cn(
            "absolute rounded-full border border-border bg-background",
            orientation === "horizontal"
              ? "top-1/2 left-1/2 h-12 w-2 -translate-x-1/2 -translate-y-1/2"
              : "top-1/2 left-1/2 h-2 w-12 -translate-x-1/2 -translate-y-1/2"
          )}
        />
      )}
    </div>
  );
}
