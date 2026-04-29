"use client";

import { useEffect, useRef, useCallback } from "react";
import JsBarcode from "jsbarcode";

interface BarcodePreviewProps {
  value: string;
  format?: "CODE128" | "EAN13" | "UPC" | "CODE39";
  height?: number;
  width?: number;
  displayValue?: boolean;
}

export function BarcodePreview({
  value,
  format = "CODE128",
  height = 50,
  width = 2,
  displayValue = true,
}: BarcodePreviewProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  const renderBarcode = useCallback(() => {
    if (svgRef.current && value) {
      try {
        // Check if dark mode is active
        const isDarkMode = document.documentElement.classList.contains("dark");

        JsBarcode(svgRef.current, value, {
          format,
          height,
          width,
          displayValue,
          fontSize: 12,
          margin: 10,
          background: "transparent",
          lineColor: isDarkMode ? "#ffffff" : "#000000",
          textColor: isDarkMode ? "#ffffff" : "#000000",
        });
      } catch (error) {
        // Invalid barcode format - just clear the SVG
        if (svgRef.current) {
          svgRef.current.innerHTML = "";
        }
      }
    }
  }, [value, format, height, width, displayValue]);

  useEffect(() => {
    renderBarcode();
  }, [renderBarcode]);

  // Listen for theme changes
  useEffect(() => {
    const observer = new MutationObserver(() => {
      renderBarcode();
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, [renderBarcode]);

  if (!value) return null;

  return (
    <div className="mt-2 flex justify-center p-2 bg-white dark:bg-muted rounded-md border border-border">
      <svg ref={svgRef} className="max-w-full" />
    </div>
  );
}
