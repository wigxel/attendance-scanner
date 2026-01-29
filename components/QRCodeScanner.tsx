"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Portal } from "@radix-ui/react-dialog";
import consola from "consola";
import { Html5Qrcode } from "html5-qrcode";
import { LucideLoader, XIcon } from "lucide-react";
import { motion } from "motion/react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Dialog } from "./ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

interface QRCodeScannerProps {
  onScan: (data: string) => void;
  onError?: (error: string) => void;
  className?: string;
  fps?: number;
  qrbox?: number;
}

type TCameraPermission = "allow" | "reject" | "idle";

export default function QRCodeScanner({
  onScan,
  onError,
  className,
  fps = 10,
  qrbox = 250,
}: QRCodeScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [permission, setPermissionDenied] = useState<TCameraPermission>("idle");
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  // const { scannerRef } = useScanner();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  // const rootRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const _ref = getScanner();
    if (!_ref) return;

    // Cleanup on unmount
    return () => {
      if (_ref.isScanning) {
        _ref.stop().catch((error) => {
          console.error("Error stopping scanner:", error);
        });
      }
    };
  }, []);

  function getScanner(): Html5Qrcode | undefined {
    if (!containerRef.current) return;

    if (scannerRef.current) return scannerRef.current;

    const scannerId = "html5-qrcode-scanner";

    // Create scanner element if it doesn't exist
    if (!document.getElementById(scannerId)) {
      const scannerDiv = document.createElement("div");
      scannerDiv.id = scannerId;
      containerRef.current.appendChild(scannerDiv);
    }

    // Initialize scanner
    const _ref = new Html5Qrcode(scannerId);
    scannerRef.current = _ref;

    return _ref;
  }

  const getCameras = async () => {
    try {
      const devices = await Html5Qrcode.getCameras();

      if (devices.length === 0) {
        return toast.error("No camera found on device");
      }

      setCameras(devices);

      // Prefer back camera if available
      const backCamera = devices.find((camera) =>
        camera.label.toLowerCase().includes("back"),
      );
      setPermissionDenied("allow");
      if (backCamera) {
        setSelectedCamera(backCamera.id);
      } else {
        setSelectedCamera(devices[0].id);
      }
    } catch (error) {
      console.error("Error getting cameras:", error);
      setPermissionDenied("reject");
      if (onError) {
        onError("Camera permission denied");
      }
    }
  };

  const startScanner = async () => {
    const scanner_ = getScanner();

    if (!scanner_) return;

    setIsScanning(true);
    setPermissionDenied("allow");

    const cameraId = selectedCamera || { facingMode: "environment" };

    try {
      await scanner_.start(
        cameraId,
        {
          fps,
          qrbox: { width: qrbox, height: qrbox },
        },
        (decodedText) => {
          onScan(decodedText);

          if (!scanner_) return;

          if (scanner_.isScanning) {
            scanner_.stop().catch(console.error);
            setIsScanning(false);
          }
        },
        (errorMessage) => {
          // This is just for QR detection errors, not for permission errors
          consola.trace("QR Error:", errorMessage);
        },
      );
    } catch (error) {
      console.error("Error starting scanner:", error);
      setIsScanning(false);
      setPermissionDenied("reject");
      if (onError) onError(error as string);
    }
  };

  const stopScanner = async () => {
    const scanner_ = getScanner();
    if (!scanner_) return;

    if (scanner_.isScanning) {
      try {
        await scanner_.stop();
        setIsScanning(false);
      } catch (error) {
        console.error("Error stopping scanner:", error);
        if (onError) onError(error as string);
      }
    }
  };

  const handleCameraChange = (value: string) => {
    setSelectedCamera(value);
    if (isScanning) {
      stopScanner().then(() => startScanner());
    }
  };

  return (
    <Dialog open={true}>
      <div className={cn("flex flex-col items-center w-full", className)}>
        {permission === "allow" ? (
          <div className="w-full">
            <div
              className={cn("flex flex-col gap-2 items-center w-full", {
                hidden: isScanning,
              })}
            >
              <Select
                // className="w-full p-2 rounded bg-background border border-input"
                value={selectedCamera || ""}
                onValueChange={(v) => {
                  handleCameraChange(v);
                }}
              >
                <SelectTrigger className="bg-white w-full">
                  <SelectValue
                    placeholder="Select camera"
                    className="h-[4rem]"
                  />
                </SelectTrigger>
                <SelectContent>
                  {cameras.map((camera) => (
                    <SelectItem key={camera.id} value={camera.id}>
                      {camera.label || `Camera ${camera.id.slice(0, 8)}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button className="w-full" onClick={startScanner}>
                Use Camera
              </Button>
            </div>

            <Portal>
              <motion.div
                initial={{ opacity: 0 }}
                animate={isScanning ? { opacity: 1 } : { opacity: 0 }}
                className={cn(
                  "*:first:rounded-2xl *:first:overflow-hidden z-20 fixed flex flex-col items-center justify-center p-12 inset-0 bg-black/[0.86]",
                  {
                    "pointer-events-none": !isScanning,
                  },
                )}
              >
                <div
                  ref={containerRef}
                  className={cn("relative w-full mx-auto overflow-hidden")}
                >
                  {/* Scanner will be rendered here */}
                </div>

                <div className="z-[-1] absolute">
                  <LucideLoader
                    size={"2rem"}
                    strokeWidth={1}
                    className="animate animate-spin text-white"
                  />
                </div>

                <button
                  type="button"
                  className="w-12 fixed right-6 top-6 flex justify-center items-center rounded-full bg-white/[0.36] backdrop-blur-sm aspect-square"
                  onClick={stopScanner}
                >
                  <XIcon className="text-white/[0.95]" />
                </button>
              </motion.div>
            </Portal>
          </div>
        ) : null}

        {permission !== "allow" ? (
          <>
            <Button
              type="button"
              variant="default"
              onClick={() => getCameras()}
              className="w-full"
            >
              Scan QR Code
            </Button>

            {permission === "reject" && (
              <p className="text-red-500 text-sm text-left">
                Camera access is required. Please allow camera access in your
                browser settings.
              </p>
            )}
          </>
        ) : null}
      </div>
    </Dialog>
  );
}
