"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Eraser, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const WIDTH = 600;
const HEIGHT = 180;

type Point = { x: number; y: number };

function paintStroke(ctx: CanvasRenderingContext2D, stroke: Point[]) {
  if (stroke.length === 0) return;
  if (stroke.length === 1) {
    ctx.beginPath();
    ctx.arc(stroke[0].x, stroke[0].y, 1.5, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  ctx.beginPath();
  ctx.moveTo(stroke[0].x, stroke[0].y);
  for (let index = 1; index < stroke.length; index += 1) {
    ctx.lineTo(stroke[index].x, stroke[index].y);
  }
  ctx.stroke();
}

export function SignaturePad({
  label,
  hint,
  required,
  onChange,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  onChange: (dataUrl: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const strokesRef = useRef<Point[][]>([]);
  const currentRef = useRef<Point[] | null>(null);
  const [hasInk, setHasInk] = useState(false);

  const configure = (ctx: CanvasRenderingContext2D) => {
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0f172a";
    ctx.fillStyle = "#0f172a";
  };

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    configure(ctx);
    for (const stroke of strokesRef.current) paintStroke(ctx, stroke);
    if (currentRef.current) paintStroke(ctx, currentRef.current);
  }, []);

  useEffect(() => {
    redraw();
  }, [redraw]);

  const exportImage = useCallback(() => {
    const strokes = strokesRef.current;
    if (strokes.length === 0) {
      onChange("");
      return;
    }

    let minX = WIDTH;
    let minY = HEIGHT;
    let maxX = 0;
    let maxY = 0;
    for (const stroke of strokes) {
      for (const point of stroke) {
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
      }
    }

    const padding = 10;
    minX = Math.max(0, minX - padding);
    minY = Math.max(0, minY - padding);
    maxX = Math.min(WIDTH, maxX + padding);
    maxY = Math.min(HEIGHT, maxY + padding);

    const width = Math.max(1, Math.ceil(maxX - minX));
    const height = Math.max(1, Math.ceil(maxY - minY));
    const temp = document.createElement("canvas");
    temp.width = width;
    temp.height = height;
    const ctx = temp.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.translate(-minX, -minY);
    configure(ctx);
    for (const stroke of strokes) paintStroke(ctx, stroke);
    onChange(temp.toDataURL("image/png"));
  }, [onChange]);

  function pointFromEvent(event: React.PointerEvent<HTMLCanvasElement>): Point {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * HEIGHT,
    };
  }

  function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    currentRef.current = [pointFromEvent(event)];
    setHasInk(true);
    redraw();
  }

  function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!currentRef.current) return;
    currentRef.current.push(pointFromEvent(event));
    redraw();
  }

  function handlePointerEnd() {
    if (!currentRef.current) return;
    if (currentRef.current.length > 0) {
      strokesRef.current.push(currentRef.current);
    }
    currentRef.current = null;
    redraw();
    exportImage();
  }

  function handleUndo() {
    strokesRef.current.pop();
    setHasInk(strokesRef.current.length > 0);
    redraw();
    exportImage();
  }

  function handleClear() {
    strokesRef.current = [];
    currentRef.current = null;
    setHasInk(false);
    redraw();
    onChange("");
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-slate-700">
          {label}
          {required ? <span className="ml-0.5 text-red-600">*</span> : null}
        </p>
        <div className="flex items-center gap-1">
          <Button type="button" variant="ghost" size="sm" onClick={handleUndo} disabled={!hasInk}>
            <Undo2 className="size-3.5" /> Deshacer
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={handleClear} disabled={!hasInk}>
            <Eraser className="size-3.5" /> Limpiar
          </Button>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        width={WIDTH}
        height={HEIGHT}
        aria-label={`Área de firma: ${label}`}
        className="aspect-[10/3] w-full cursor-crosshair touch-none rounded-lg border border-dashed border-slate-300 bg-white"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
      />
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className={hasInk ? "text-emerald-600" : "text-slate-400"}>
          {hasInk ? "Firma capturada" : "Dibuja la firma con el puntero o el dedo."}
        </span>
        {hint ? <span className="text-slate-400">{hint}</span> : null}
      </div>
    </div>
  );
}
