"use client";

import React, { useState, useEffect, useRef } from "react";
import { Stage, Layer, Image as KonvaImage, Rect, Text, Transformer, Group } from "react-konva";
import { TrainingPage, Annotation, AnnotationType } from "../store/studioStore";

interface Props {
  page: TrainingPage;
  zoom?: number;
  showOCR?: boolean;
  onAnnotationChange?: (annotation: Annotation) => void;
  onAnnotationDelete?: (id: string) => void;
  onAnnotationCreate?: (annotation: Omit<Annotation, "id">) => void;
  activeAnnotationId?: string | null;
  setActiveAnnotationId?: (id: string | null) => void;
  drawingMode?: boolean;
}

const AnnotationRect: React.FC<{
  annotation: Annotation;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (newAttr: Partial<Annotation>) => void;
  primaryColor: string;
}> = ({ annotation, isSelected, onSelect, onChange, primaryColor }) => {
  const shapeRef = useRef<any>(null);
  const trRef = useRef<any>(null);

  useEffect(() => {
    if (isSelected && trRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [isSelected]);

  const color = annotation.color === "var(--primary)" ? primaryColor : (annotation.color || primaryColor);

  return (
    <React.Fragment>
      <Rect
        ref={shapeRef}
        {...annotation}
        stroke={color}
        strokeWidth={2}
        fill={isSelected ? color + "33" : "transparent"}
        draggable
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={(e) => {
          onChange({
            x: e.target.x(),
            y: e.target.y(),
          });
        }}
        onTransformEnd={(e) => {
          const node = shapeRef.current;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();
          node.scaleX(1);
          node.scaleY(1);
          onChange({
            x: node.x(),
            y: node.y(),
            width: Math.max(5, node.width() * scaleX),
            height: Math.max(5, node.height() * scaleY),
          });
        }}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          rotateEnabled={false}
          borderStroke={color}
          anchorStroke={color}
          anchorFill="white"
          anchorSize={8}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 5 || newBox.height < 5) return oldBox;
            return newBox;
          }}
        />
      )}
      <Text
        x={annotation.x}
        y={annotation.y - 15}
        text={annotation.label || "Region"}
        fontSize={12}
        fontStyle="bold"
        fill={color}
      />
    </React.Fragment>
  );
};

export const UniversalDocumentCanvas: React.FC<Props> = ({ 
  page, 
  zoom = 100,
  showOCR = false,
  onAnnotationChange,
  onAnnotationDelete,
  onAnnotationCreate,
  activeAnnotationId,
  setActiveAnnotationId,
  drawingMode = false
}) => {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [primaryColor, setPrimaryColor] = useState("#3b82f6");
  const stageRef = useRef<any>(null);
  const [newAnnotation, setNewAnnotation] = useState<any>(null);
  const [hoveredWord, setHoveredWord] = useState<any>(null);

  useEffect(() => {
    const img = new window.Image();
    img.src = page.imageUrl;
    img.onload = () => setImage(img);
    
    if (typeof window !== "undefined") {
      const style = getComputedStyle(document.documentElement);
      const color = style.getPropertyValue('--primary').trim();
      if (color) setPrimaryColor(color);
    }
  }, [page]);

  const scale = zoom / 100;

  const handleMouseDown = (e: any) => {
    if (!drawingMode) {
      const clickedOnEmpty = e.target === e.target.getStage();
      if (clickedOnEmpty) setActiveAnnotationId?.(null);
      return;
    }

    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    setNewAnnotation({
      x: pos.x / scale,
      y: pos.y / scale,
      width: 0,
      height: 0,
      key: "new",
    });
  };

  const handleMouseMove = (e: any) => {
    if (!newAnnotation || !drawingMode) return;

    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    setNewAnnotation({
      ...newAnnotation,
      width: (pos.x / scale) - newAnnotation.x,
      height: (pos.y / scale) - newAnnotation.y,
    });
  };

  const handleMouseUp = () => {
    if (!newAnnotation || !drawingMode) return;
    
    if (Math.abs(newAnnotation.width) > 5 && Math.abs(newAnnotation.height) > 5) {
      onAnnotationCreate?.({
        x: newAnnotation.width < 0 ? newAnnotation.x + newAnnotation.width : newAnnotation.x,
        y: newAnnotation.height < 0 ? newAnnotation.y + newAnnotation.height : newAnnotation.y,
        width: Math.abs(newAnnotation.width),
        height: Math.abs(newAnnotation.height),
        label: "New Region",
        type: "field" as any,
        color: "var(--primary)",
        pageId: page.pageId
      });
    }
    setNewAnnotation(null);
  };

  if (!image) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-zinc-950 text-zinc-600 font-black uppercase tracking-widest text-[10px]">
        Loading Canvas...
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-zinc-950 overflow-auto flex items-center justify-center p-2 custom-scrollbar">
      <div className="shadow-2xl border border-border/10">
        <Stage
          ref={stageRef}
          width={(page.width || 800) * scale}
          height={(page.height || 1100) * scale}
          scaleX={scale}
          scaleY={scale}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          {/* DOCUMENT IMAGE LAYER */}
          <Layer>
            <KonvaImage
              image={image}
              width={page.width || 800}
              height={page.height || 1100}
            />
          </Layer>

          {/* OCR TEXT LAYER */}
          {showOCR && page.textLayer && (
            <Layer>
              {page.textLayer.map((word) => (
                <Group 
                  key={word.id}
                  onMouseEnter={(e) => {
                    const stage = e.target.getStage();
                    const container = stage.container();
                    container.style.cursor = "pointer";
                    setHoveredWord(word);
                  }}
                  onMouseLeave={(e) => {
                    const stage = e.target.getStage();
                    const container = stage.container();
                    container.style.cursor = "default";
                    setHoveredWord(null);
                  }}
                >
                  <Rect
                    x={word.x}
                    y={word.y}
                    width={word.width}
                    height={word.height}
                    stroke={primaryColor}
                    strokeWidth={1}
                    fill={hoveredWord?.id === word.id ? primaryColor + "22" : "transparent"}
                    opacity={0.3}
                  />
                  {/* Subtle Text Overlay to make the word readable */}
                  <Text
                    x={word.x}
                    y={word.y}
                    width={word.width}
                    height={word.height}
                    text={word.text}
                    fontSize={Math.max(9, (word.height || 12) - 2)}
                    fontStyle="bold"
                    fill={primaryColor}
                    align="center"
                    verticalAlign="middle"
                    opacity={0.8}
                  />
                </Group>
              ))}
              
              {/* Premium Floating Tooltip for Hovered OCR Word */}
              {hoveredWord && (
                <Group>
                  {/* Bounding box for tooltip */}
                  <Rect
                    x={hoveredWord.x + (hoveredWord.width / 2) - 80}
                    y={hoveredWord.y - 45}
                    width={160}
                    height={38}
                    fill="#18181b"
                    cornerRadius={8}
                    stroke="#27272a"
                    strokeWidth={1}
                    shadowColor="black"
                    shadowBlur={8}
                    shadowOpacity={0.4}
                    shadowOffset={{ x: 0, y: 4 }}
                  />
                  {/* Word Text in Tooltip */}
                  <Text
                    x={hoveredWord.x + (hoveredWord.width / 2) - 72}
                    y={hoveredWord.y - 38}
                    text={`Word: "${hoveredWord.text}"`}
                    fontSize={10}
                    fontStyle="bold"
                    fill="white"
                  />
                  {/* Confidence in Tooltip */}
                  <Text
                    x={hoveredWord.x + (hoveredWord.width / 2) - 72}
                    y={hoveredWord.y - 24}
                    text={`Confidence: ${hoveredWord.confidence > 1 ? hoveredWord.confidence.toFixed(0) : (hoveredWord.confidence * 100).toFixed(1)}%`}
                    fontSize={9}
                    fill={hoveredWord.confidence >= 0.9 ? "#10b981" : "#f59e0b"}
                  />
                </Group>
              )}
            </Layer>
          )}

          {/* ANNOTATION LAYER */}
          <Layer>
            {page.annotations?.map((ann) => (
              <AnnotationRect
                key={ann.id}
                annotation={ann}
                primaryColor={primaryColor}
                isSelected={ann.id === activeAnnotationId}
                onSelect={() => setActiveAnnotationId?.(ann.id)}
                onChange={(newAttr) => onAnnotationChange?.({ ...ann, ...newAttr })}
              />
            ))}
            {newAnnotation && (
              <Rect
                x={newAnnotation.x}
                y={newAnnotation.y}
                width={newAnnotation.width}
                height={newAnnotation.height}
                stroke={primaryColor}
                strokeWidth={2}
                dash={[5, 5]}
              />
            )}
          </Layer>
        </Stage>
      </div>
    </div>
  );
};
