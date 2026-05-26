
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Camera, AlertTriangle, X } from "lucide-react";
import { Html5Qrcode, Html5QrcodeSupportedFormats, QrcodeSuccessCallback, QrcodeErrorCallback } from "html5-qrcode";

const SCANNER_ID = "barcode-scanner-dialog";

interface BarcodeScannerDialogProps {
  onScanSuccess: (decodedText: string) => void;
}

// Define the formats we want to support, including EAN-13 for retail products.
const supportedFormats = [
    Html5QrcodeSupportedFormats.EAN_13,
    Html5QrcodeSupportedFormats.CODE_128,
    Html5QrcodeSupportedFormats.QR_CODE,
    Html5QrcodeSupportedFormats.UPC_A,
    Html5QrcodeSupportedFormats.UPC_E,
];


export function BarcodeScannerDialog({ onScanSuccess }: BarcodeScannerDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasPermission, setHasPermission] = useState(true);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const { toast } = useToast();

  const stopScanner = useCallback(async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
      } catch (err) {
        // Ignore errors when stopping, as the scanner might already be stopped.
      }
    }
  }, []);

  const startScanner = useCallback(async () => {
    // Ensure scanner is stopped before starting a new session
    await stopScanner();

    // Check if the DOM element is ready
    const scannerElement = document.getElementById(SCANNER_ID);
    if (!scannerElement) {
        console.error("Scanner element not found in DOM");
        return;
    }
    
    // Initialize the scanner if it hasn't been already
    if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(SCANNER_ID, { 
            formatsToSupport: supportedFormats,
            verbose: false 
        });
    }
    const html5Qrcode = scannerRef.current;
    
    try {
        const cameras = await Html5Qrcode.getCameras();
        if (cameras && cameras.length) {
            setHasPermission(true);
            const qrCodeSuccessCallback: QrcodeSuccessCallback = (decodedText, decodedResult) => {
                onScanSuccess(decodedText);
                toast({ title: "Barcode Terdeteksi!", description: `Kode: ${decodedText}` });
                setIsOpen(false); // Close dialog on successful scan
            };
            const qrCodeErrorCallback: QrcodeErrorCallback = (errorMessage) => {
                // This callback is called frequently, so we can choose to ignore errors.
                // console.warn(`Barcode scan error: ${errorMessage}`);
            };
            await html5Qrcode.start(
                { facingMode: "environment" },
                { fps: 10, qrbox: { width: 250, height: 250 } },
                qrCodeSuccessCallback,
                qrCodeErrorCallback
            );
        } else {
            setHasPermission(false);
        }
    } catch (err) {
        console.error("Error starting scanner:", err);
        setHasPermission(false);
    }
  }, [onScanSuccess, stopScanner, toast]);
  
  useEffect(() => {
    if (isOpen) {
        // Delay starting the scanner slightly to ensure the dialog and DOM are ready
        const timer = setTimeout(() => {
            startScanner();
        }, 150); 
        return () => clearTimeout(timer);
    } else {
        stopScanner();
    }
    
  }, [isOpen, startScanner, stopScanner]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <Camera className="h-4 w-4" />
          <span className="sr-only">Pindai Barcode</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pindai Barcode Produk</DialogTitle>
          <DialogDescription>
            Posisikan barcode di dalam kotak untuk memindai SKU produk secara otomatis.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center items-center rounded-lg overflow-hidden border bg-black">
           <div id={SCANNER_ID} className="w-full aspect-video"></div>
        </div>
        {!hasPermission && (
            <div className="text-destructive text-sm flex items-center gap-2 p-2 rounded-md bg-destructive/10">
                <AlertTriangle className="h-4 w-4"/>
                <span>Izin kamera ditolak. Aktifkan di pengaturan browser Anda.</span>
            </div>
        )}
        <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
                <X className="mr-2 h-4 w-4"/> Batal
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
