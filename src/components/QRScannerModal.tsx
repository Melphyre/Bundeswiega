import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeCameraScanConfig } from 'html5-qrcode';

export interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decodedText: string) => void;
  title?: string;
  description?: string;
  scanCooldownMs?: number;
  darkMode?: boolean;
}

interface CameraDevice {
  id: string;
  label: string;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
  title = "QR-Code scannen",
  description = "Halte den QR-Code deines Mitspielers in den Rahmen",
  scanCooldownMs = 1500,
  darkMode = true,
}) => {
  const scannerContainerId = "html5qrcode-scanner-view";
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);
  const isStoppingRef = useRef<boolean>(false);
  const lastScanTimeRef = useRef<number>(0);

  const [status, setStatus] = useState<'idle' | 'initializing' | 'scanning' | 'paused' | 'error' | 'permission_denied'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [availableCameras, setAvailableCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [lastScannedText, setLastScannedText] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [torchSupported, setTorchSupported] = useState<boolean>(false);

  // Audio feedback synthesizer (no external audio assets required)
  const playBeep = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch {
      // Audio fallback ignored
    }
  }, []);

  // Safe camera stream teardown
  const stopScanner = useCallback(async (): Promise<void> => {
    if (isStoppingRef.current) return;
    isStoppingRef.current = true;

    if (html5QrcodeRef.current) {
      try {
        if (html5QrcodeRef.current.isScanning) {
          await html5QrcodeRef.current.stop();
        }
        html5QrcodeRef.current.clear();
      } catch (err) {
        console.warn("[QRScannerModal] Cleanup notice:", err);
      } finally {
        html5QrcodeRef.current = null;
      }
    }

    // Direct fallback MediaStream cleanup for iOS Safari stuck camera indicator
    try {
      const videoElem = document.querySelector(`#${scannerContainerId} video`) as HTMLVideoElement | null;
      if (videoElem && videoElem.srcObject) {
        const stream = videoElem.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
        videoElem.srcObject = null;
      }
    } catch {
      // Stream fallback cleanup
    }

    setTorchOn(false);
    setTorchSupported(false);
    setStatus('idle');
    isStoppingRef.current = false;
  }, [scannerContainerId]);

  // Handle successful scan
  const handleScanCallback = useCallback((decodedText: string) => {
    const now = Date.now();
    if (now - lastScanTimeRef.current < scanCooldownMs) {
      return; // Cooldown debounce active
    }
    lastScanTimeRef.current = now;

    // Haptic & Audio feedback
    if (navigator.vibrate) {
      try { navigator.vibrate(100); } catch {}
    }
    playBeep();

    setLastScannedText(decodedText);
    setStatus('paused');

    // Trigger callback
    onScanSuccess(decodedText);

    // Auto resume scan after cooldown if modal stays open
    setTimeout(() => {
      setStatus('scanning');
      setLastScannedText(null);
    }, scanCooldownMs);
  }, [onScanSuccess, playBeep, scanCooldownMs]);

  // Start Scanner
  const startScanner = useCallback(async (cameraIdOverride?: string) => {
    if (!isOpen) return;

    // Verify DOM element exists
    const containerElem = document.getElementById(scannerContainerId);
    if (!containerElem) {
      setErrorMessage("Scanner-Container wurde nicht im DOM gefunden.");
      setStatus('error');
      return;
    }

    setStatus('initializing');
    setErrorMessage(null);

    // Teardown any existing instance first
    await stopScanner();

    try {
      // 1. Enumerate available cameras
      let cameras: CameraDevice[] = [];
      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          cameras = devices.map(d => ({ id: d.id, label: d.label || `Kamera ${d.id.slice(0, 5)}` }));
          setAvailableCameras(cameras);
        }
      } catch (e) {
        console.warn("[QRScannerModal] Could not enumerate camera list, falling back to facingMode constraints:", e);
      }

      // 2. Instantiate Html5Qrcode
      const scannerInstance = new Html5Qrcode(scannerContainerId, { verbose: false });
      html5QrcodeRef.current = scannerInstance;

      const config: Html5QrcodeCameraScanConfig = {
        fps: 15,
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          const minDim = Math.min(viewfinderWidth, viewfinderHeight);
          const size = Math.floor(minDim * 0.7);
          return { width: size, height: size };
        },
        aspectRatio: 1.0,
      };

      // Determine camera configuration (Prefer environment / back camera)
      let cameraConfig: any = { facingMode: "environment" };

      if (cameraIdOverride) {
        cameraConfig = { deviceId: { exact: cameraIdOverride } };
      } else if (cameras.length > 0) {
        // Find rear/back camera from enumerated list
        const backCam = cameras.find(c =>
          /back|rear|umgebung|rück|environment/i.test(c.label)
        ) || cameras[cameras.length - 1]; // usually back camera is listed last on mobiles

        if (backCam) {
          cameraConfig = { deviceId: { exact: backCam.id } };
          setSelectedCameraId(backCam.id);
        }
      }

      // 3. Start scanning
      await scannerInstance.start(
        cameraConfig,
        config,
        (decodedText) => handleScanCallback(decodedText),
        () => {} // Silent ignore frame decode failures
      );

      setStatus('scanning');

      // Check torch capability
      try {
        const capabilities = scannerInstance.getRunningTrackCapabilities?.() as any;
        if (capabilities && 'torch' in capabilities) {
          setTorchSupported(true);
        }
      } catch {
        setTorchSupported(false);
      }

    } catch (err: any) {
      console.error("[QRScannerModal] Camera start error:", err);
      const errStr = String(err?.message || err || '');

      if (
        errStr.includes('NotAllowedError') ||
        errStr.includes('Permission denied') ||
        errStr.includes('PermissionDeniedError')
      ) {
        setStatus('permission_denied');
        setErrorMessage("Kamerazugriff verweigert. Bitte erlaube den Zugriff in deinen Browser-Einstellungen.");
      } else if (errStr.includes('NotFoundError') || errStr.includes('DevicesNotFoundError')) {
        setStatus('error');
        setErrorMessage("Keine Kamera auf diesem Gerät gefunden.");
      } else if (!window.isSecureContext && window.location.hostname !== 'localhost') {
        setStatus('error');
        setErrorMessage("Kamerazugriff erfordert eine sichere HTTPS-Verbindung.");
      } else {
        setStatus('error');
        setErrorMessage(`Kamera konnte nicht gestartet werden (${errStr || 'Unbekannter Fehler'}).`);
      }
    }
  }, [isOpen, scannerContainerId, stopScanner, handleScanCallback]);

  // Toggle Torch (Flashlight)
  const toggleTorch = async () => {
    if (!html5QrcodeRef.current || !torchSupported) return;
    try {
      const nextTorch = !torchOn;
      await html5QrcodeRef.current.applyVideoConstraints({
        advanced: [{ torch: nextTorch } as any]
      });
      setTorchOn(nextTorch);
    } catch (e) {
      console.warn("Torch toggle failed:", e);
    }
  };

  // Switch camera if user selects another camera
  const handleCameraChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCamId = e.target.value;
    setSelectedCameraId(newCamId);
    startScanner(newCamId);
  };

  // Lifecycle handling when modal opens/closes
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    if (isOpen) {
      // Delay slightly to ensure React has finished rendering the container div
      timeoutId = setTimeout(() => {
        startScanner();
      }, 150);
    } else {
      stopScanner();
    }

    return () => {
      clearTimeout(timeoutId);
      stopScanner();
    };
  }, [isOpen, startScanner, stopScanner]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[850] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`w-full max-w-md rounded-3xl p-6 shadow-2xl border flex flex-col items-center relative overflow-hidden transition-all ${
          darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-gray-200 text-gray-900'
        }`}
      >
        {/* Header */}
        <div className="w-full flex justify-between items-center mb-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-[#238183]/20 flex items-center justify-center text-[#238183]">
              <i className="fas fa-qrcode text-base"></i>
            </div>
            <h3 className="font-black text-lg tracking-tight">{title}</h3>
          </div>
          <button
            type="button"
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="w-9 h-9 rounded-full bg-gray-500/10 hover:bg-gray-500/20 flex items-center justify-center text-sm font-bold transition-all cursor-pointer"
          >
            ✕
          </button>
        </div>

        {description && (
          <p className="text-xs opacity-70 mb-4 text-center px-2">{description}</p>
        )}

        {/* Camera Selector & Flashlight Controls Bar */}
        {status === 'scanning' && (
          <div className="w-full flex items-center justify-between gap-2 mb-3 px-1">
            {availableCameras.length > 1 ? (
              <select
                value={selectedCameraId || ''}
                onChange={handleCameraChange}
                className={`text-xs font-bold py-1.5 px-3 rounded-xl border flex-1 outline-none ${
                  darkMode ? 'bg-slate-800 border-slate-700 text-gray-200' : 'bg-gray-100 border-gray-300 text-gray-800'
                }`}
              >
                {availableCameras.map(cam => (
                  <option key={cam.id} value={cam.id}>
                    📷 {cam.label}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-[11px] font-bold opacity-60 flex items-center gap-1">
                <i className="fas fa-camera text-xs"></i> Rückkamera aktiv
              </span>
            )}

            {torchSupported && (
              <button
                type="button"
                onClick={toggleTorch}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                  torchOn
                    ? 'bg-amber-500 border-amber-400 text-slate-950 shadow-lg shadow-amber-500/30'
                    : darkMode
                    ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700'
                    : 'bg-gray-100 border-gray-300 text-amber-600 hover:bg-gray-200'
                }`}
              >
                <i className={`fas fa-bolt ${torchOn ? 'animate-bounce' : ''}`}></i>
                <span>{torchOn ? 'Blitz an' : 'Blitz aus'}</span>
              </button>
            )}
          </div>
        )}

        {/* Scanner Container Viewport */}
        <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-black flex items-center justify-center border-2 border-[#238183]/40 shadow-inner">
          <div id={scannerContainerId} className="w-full h-full object-cover"></div>

          {/* Overlay loading state */}
          {status === 'initializing' && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center space-y-3 p-4 text-center z-10">
              <div className="w-10 h-10 border-4 border-[#238183] border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs font-bold text-white">Kamera wird gestartet...</p>
            </div>
          )}

          {/* Success Pause Banner */}
          {status === 'paused' && (
            <div className="absolute inset-0 bg-emerald-950/80 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center z-10 space-y-2 animate-in zoom-in-95">
              <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xl shadow-lg">
                ✓
              </div>
              <p className="text-xs font-black text-emerald-300 uppercase tracking-wider">Erfolgreich erfasst!</p>
              <p className="text-sm font-bold text-white max-w-[200px] truncate">{lastScannedText}</p>
            </div>
          )}

          {/* Error / Permission Denied Banner */}
          {(status === 'error' || status === 'permission_denied') && (
            <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center z-10 space-y-4">
              <div className="w-12 h-12 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 flex items-center justify-center text-xl">
                ⚠️
              </div>
              <p className="text-xs font-bold text-red-400 max-w-xs leading-relaxed">
                {errorMessage || "Fehler beim Starten der Kamera."}
              </p>
              <div className="flex flex-col gap-2 w-full max-w-xs">
                <button
                  type="button"
                  onClick={() => startScanner()}
                  className="w-full py-2.5 rounded-xl bg-[#238183] text-white font-bold text-xs uppercase tracking-wider shadow hover:brightness-110 cursor-pointer active:scale-95"
                >
                  Erneut versuchen
                </button>
                {status === 'permission_denied' && (
                  <p className="text-[11px] opacity-60 text-gray-300 leading-normal">
                    Tipp: Klicke in Safari / Chrome auf das Schloss- oder Kamera-Symbol in der Adressleiste, um den Kamerazugriff zu erlauben.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="w-full mt-4 flex gap-3">
          <button
            type="button"
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider border transition-all cursor-pointer active:scale-95 ${
              darkMode
                ? 'border-slate-700 text-gray-300 hover:bg-slate-800'
                : 'border-gray-300 text-gray-700 hover:bg-gray-100'
            }`}
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
};
export default QRScannerModal;
